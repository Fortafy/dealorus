import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GOOGLE_DOCS_SCOPE = 'https://www.googleapis.com/auth/documents';
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return `$${Number(value).toLocaleString()}`;
};

const formatContractType = (value) => {
  if (!value) return '—';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const stripHtml = (html) => {
  if (!html) return '—';
  return String(html)
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim() || '—';
};

const buildServicesSummary = (deal) => {
  if (!deal.services?.length) return '—';

  return deal.services.map((service) => {
    const quantity = deal.contract_type === 'project'
      ? service.total_estimated_hours
      : service.hours_per_month;
    const parts = [service.service_name || 'Service'];
    if (quantity || quantity === 0) parts.push(`${quantity} hours`);
    if (service.rate || service.rate === 0) parts.push(`at ${formatMoney(service.rate)}/hr`);
    return `• ${parts.join(' ')}`;
  }).join('\n');
};

const ensureGoogleToken = async (integrationRecord) => {
  const expiresAt = integrationRecord.expires_at ? new Date(integrationRecord.expires_at).getTime() : 0;
  const isExpired = !integrationRecord.access_token || (expiresAt && expiresAt <= Date.now() + 60 * 1000);

  if (!isExpired) return integrationRecord;
  if (!integrationRecord.refresh_token) throw new Error('Google Drive needs to be reconnected.');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      refresh_token: integrationRecord.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Could not refresh Google Drive access.');
  }

  const tokenData = await response.json();
  return {
    ...integrationRecord,
    access_token: tokenData.access_token,
    expires_at: tokenData.expires_in ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString() : integrationRecord.expires_at,
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const dealId = body?.dealId;
    const templateDocId = body?.templateDocId;
    const destinationFolderId = body?.destinationFolderId;

    if (!dealId || !templateDocId || !destinationFolderId) {
      return Response.json({ error: 'dealId, templateDocId, and destinationFolderId are required' }, { status: 400 });
    }

    const integrationRecords = await base44.entities.UserIntegration.filter({
      user_id: user.id,
      integration_type: 'google_drive',
      status: 'connected',
    });
    const integrationRecord = integrationRecords[0];

    if (!integrationRecord) {
      return Response.json({ error: 'Connect Google Drive first.' }, { status: 400 });
    }

    const grantedScopes = integrationRecord.scopes || [];
    if (!grantedScopes.includes(GOOGLE_DRIVE_SCOPE) || !grantedScopes.includes(GOOGLE_DOCS_SCOPE)) {
      return Response.json({ error: 'Reconnect Google Drive to grant document permissions.' }, { status: 400 });
    }

    const authorizedRecord = await ensureGoogleToken(integrationRecord);
    if (authorizedRecord.access_token !== integrationRecord.access_token || authorizedRecord.expires_at !== integrationRecord.expires_at) {
      await base44.entities.UserIntegration.update(integrationRecord.id, {
        access_token: authorizedRecord.access_token,
        expires_at: authorizedRecord.expires_at,
      });
    }

    const deals = await base44.entities.Deal.filter({ id: dealId });
    const deal = deals[0];
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const organizations = deal.organization_id ? await base44.entities.Organization.filter({ id: deal.organization_id }) : [];
    const clients = deal.client_id ? await base44.entities.Client.filter({ id: deal.client_id }) : [];
    const organization = organizations[0] || null;
    const client = clients[0] || null;
    const lifecycleStage = client?.lifecycle_stages?.find((stage) => stage.id === deal.stage) || null;

    const copyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${templateDocId}/copy?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authorizedRecord.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${deal.name || 'Proposal'} Proposal`,
        parents: [destinationFolderId],
      }),
    });

    if (!copyResponse.ok) {
      const details = await copyResponse.text();
      throw new Error(details || 'Could not copy the Google Doc template.');
    }

    const copyData = await copyResponse.json();
    const docId = copyData.id;
    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

    const replacements = {
      '{{deal_name}}': deal.name || '—',
      '{{organization_name}}': deal.organization_name || organization?.organization_name || '—',
      '{{deal_value}}': formatMoney(deal.value),
      '{{contract_type}}': formatContractType(deal.contract_type),
      '{{stage_name}}': lifecycleStage?.name || deal.stage || '—',
      '{{start_date}}': formatDate(deal.start_date),
      '{{end_date}}': formatDate(deal.end_date),
      '{{expected_close_date}}': formatDate(deal.expected_close_date),
      '{{services_summary}}': buildServicesSummary(deal),
      '{{deal_notes}}': stripHtml(deal.description),
      '{{client_name}}': client?.name || '—',
    };

    const batchUpdateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authorizedRecord.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: Object.entries(replacements).map(([text, replaceText]) => ({
          replaceAllText: {
            containsText: { text, matchCase: true },
            replaceText,
          },
        })),
      }),
    });

    if (!batchUpdateResponse.ok) {
      const details = await batchUpdateResponse.text();
      throw new Error(details || 'Could not replace template tags in the Google Doc.');
    }

    const generatedAt = new Date().toISOString();
    await base44.entities.Deal.update(deal.id, {
      proposal_doc_url: docUrl,
      proposal_doc_generated_at: generatedAt,
    });

    return Response.json({ docId, docUrl, generatedAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});