import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const clientId = currentUser.client_id || currentUser.data?.client_id;
    const clientRole = currentUser.client_role || currentUser.data?.client_role;

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!clientId) {
      return Response.json({ error: 'Your account is not assigned to a client organization.' }, { status: 400 });
    }

    if (clientRole !== 'admin') {
      return Response.json({ error: 'Forbidden: Client admin access required.' }, { status: 403 });
    }

    await base44.auth.inviteUser(email, 'user');

    let invitedUser = null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const matchedUsers = await base44.asServiceRole.entities.User.filter({ email });

      if (matchedUsers.length > 0) {
        invitedUser = matchedUsers[0];
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 750));
    }

    if (!invitedUser) {
      return Response.json({ error: 'Invitation was sent, but the user record is not ready yet. Please try again in a moment.' }, { status: 500 });
    }

    await base44.asServiceRole.entities.User.update(invitedUser.id, {
      client_id: clientId,
      client_role: 'member',
      invitation_status: 'pending',
      is_active: true,
    });

    return Response.json({
      success: true,
      invited_user_id: invitedUser.id,
      invitation_status: 'pending',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});