import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const userId = typeof payload.userId === 'string' ? payload.userId : '';
    const clientId = typeof payload.clientId === 'string' ? payload.clientId : (currentUser.active_client_id || currentUser.data?.active_client_id || '');
    const clientRole = payload.clientRole;
    const isActive = payload.isActive;
    const currentClientId = currentUser.active_client_id || currentUser.data?.active_client_id;
    const currentMemberships = await base44.asServiceRole.entities.ClientUser.filter({
      user_id: currentUser.id,
      client_id: currentClientId,
      status: 'active',
    });
    const currentMembership = currentMemberships[0] || null;
    const currentClientRole = currentMembership?.role;

    if (currentUser.role !== 'admin' && currentClientRole !== 'admin') {
      return Response.json({ error: 'Forbidden: Client admin access required.' }, { status: 403 });
    }

    if (!userId) {
      return Response.json({ error: 'Missing team member ID.' }, { status: 400 });
    }

    const memberships = await base44.asServiceRole.entities.ClientUser.filter({ user_id: userId, client_id: clientId });
    const membership = memberships[0];

    if (!membership) {
      return Response.json({ error: 'Team member not found.' }, { status: 404 });
    }

    if (membership.user_id === currentUser.id) {
      return Response.json({ error: "You can't change your own access here." }, { status: 400 });
    }

    const updates = {};

    if (typeof clientRole === 'string') {
      if (!['admin', 'member'].includes(clientRole)) {
        return Response.json({ error: 'Invalid client role.' }, { status: 400 });
      }
      updates.role = clientRole;
    }

    if (typeof isActive === 'boolean') {
      updates.status = isActive ? 'active' : 'inactive';
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No member changes were provided.' }, { status: 400 });
    }

    const updatedMembership = await base44.asServiceRole.entities.ClientUser.update(membership.id, updates);

    return Response.json({ success: true, user: updatedMembership });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});