import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const clientId = typeof payload.clientId === 'string' ? payload.clientId : '';

    if (!clientId) {
      return Response.json({ error: 'Missing client ID.' }, { status: 400 });
    }

    const memberships = await base44.asServiceRole.entities.ClientUser.filter({
      user_id: user.id,
      client_id: clientId,
      status: 'active',
    });

    if (memberships.length === 0 && user.role !== 'admin') {
      return Response.json({ error: 'You do not have access to this client.' }, { status: 403 });
    }

    await base44.auth.updateMe({ active_client_id: clientId });
    const refreshedUser = await base44.auth.me();

    return Response.json({ success: true, user: refreshedUser });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});