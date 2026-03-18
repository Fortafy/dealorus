import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.client_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is the org admin or platform admin
    const clients = await base44.asServiceRole.entities.Client.filter({ id: user.client_id });
    if (!clients || clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }
    const client = clients[0];

    if (client.admin_user_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Only organization administrators can generate API keys.' }, { status: 403 });
    }

    // Generate a secure API key: dlrs_ + 32 random hex chars
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const apiKey = 'dlrs_' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Save to client record
    await base44.asServiceRole.entities.Client.update(user.client_id, { api_key: apiKey });

    return Response.json({ success: true, api_key: apiKey });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});