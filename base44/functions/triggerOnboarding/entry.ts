import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ONBOARDING_URL = 'https://client-onboarding-fdfc7132.base44.app/functions/runOnboarding';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id } = await req.json().catch(() => ({}));
    if (!org_id) {
      return Response.json({ error: 'org_id is required' }, { status: 400 });
    }

    const org = await base44.asServiceRole.entities.Organization.get(org_id);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (org.is_provisioned) {
      return Response.json({ error: 'Organization is already provisioned', already_provisioned: true }, { status: 409 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const onboardResp = await fetch(ONBOARDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        organization_name: org.organization_name,
        abbreviation: org.abbreviation,
        ein: org.ein || null,
        website: org.website || null,
        city: org.city || null,
        state: org.state || null,
        zip_code: org.zip_code || null,
        mission: org.mission || null,
        annual_revenue: org.annual_revenue || null,
        salesforce_id: org.salesforce_id || null,
      }),
    });

    if (!onboardResp.ok) {
      const err = await onboardResp.text();
      return Response.json({ error: `Onboarding failed: ${err}` }, { status: 500 });
    }

    const result = await onboardResp.json();
    const { google_group, google_drive, timesync } = result.results || {};

    await base44.asServiceRole.entities.Organization.update(org_id, {
      google_group_id: google_group?.groupId || null,
      google_group_email: google_group?.groupEmail || null,
      google_drive_folder_id: google_drive?.clientFolderId || null,
      timesync_id: timesync?.id || null,
      is_provisioned: true,
    });

    return Response.json({
      success: true,
      steps: {
        google_group: { label: 'Create Google Group', status: 'done', value: google_group?.groupEmail },
        google_drive: { label: 'Create Google Drive Folder', status: 'done', value: google_drive?.clientFolderId },
        timesync: { label: 'Add to Timesync', status: 'done', value: timesync?.id },
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});