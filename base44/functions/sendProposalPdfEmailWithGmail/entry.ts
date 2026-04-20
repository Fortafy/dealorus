import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '69e6a0603f40a2278282ab3b';

function toBase64Url(value) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealId, to, subject, body, pdfUrl } = await req.json();

    if (!dealId || !to || !subject || !body || !pdfUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dealResults = await base44.entities.Deal.filter({ id: dealId });
    const deal = dealResults[0];

    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    const emailBody = `${body}\n\nProposal PDF: ${pdfUrl}`;
    const mimeMessage = [
      `To: ${to}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      emailBody,
    ].join('\r\n');

    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: toBase64Url(mimeMessage) }),
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      return Response.json({ error: errorText || 'Failed to send email with Gmail' }, { status: 500 });
    }

    await base44.entities.Activity.create({
      client_id: deal.client_id,
      organization_id: deal.organization_id,
      contact_id: deal.id,
      action: 'email',
      description: `Proposal PDF emailed to ${to}`,
      fields_changed: [
        { field: 'recipient', old_value: null, new_value: to },
        { field: 'subject', old_value: null, new_value: subject },
        { field: 'pdf_url', old_value: null, new_value: pdfUrl }
      ]
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});