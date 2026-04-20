import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    await base44.integrations.Core.SendEmail({
      to,
      subject,
      body,
    });

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