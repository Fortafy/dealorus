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
    const clientId = typeof payload.clientId === 'string' ? payload.clientId : '';
    const clientRole = payload.clientRole;
    const isActive = payload.isActive;
    const currentClientId = currentUser.client_id || currentUser.data?.client_id;
    const currentClientRole = currentUser.client_role || currentUser.data?.client_role;

    if (currentClientRole !== 'admin') {
      return Response.json({ error: 'Forbidden: Client admin access required.' }, { status: 403 });
    }

    if (!userId) {
      return Response.json({ error: 'Missing team member ID.' }, { status: 400 });
    }

    const updates = {};

    if (clientId) {
      updates.client_id = clientId;
    }

    if (typeof clientRole === 'string') {
      if (!['admin', 'member'].includes(clientRole)) {
        return Response.json({ error: 'Invalid client role.' }, { status: 400 });
      }
      updates.client_role = clientRole;
    }

    if (typeof isActive === 'boolean') {
      updates.is_active = isActive;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No member changes were provided.' }, { status: 400 });
    }

    const targetUser = await base44.asServiceRole.entities.User.get(userId);

    if (!targetUser) {
      return Response.json({ error: 'Team member not found.' }, { status: 404 });
    }

    if (targetUser.id === currentUser.id) {
      return Response.json({ error: "You can't change your own access here." }, { status: 400 });
    }


    const updatedUser = await base44.asServiceRole.entities.User.update(userId, updates);

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});