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
    const requestedClientId = typeof payload.clientId === 'string' ? payload.clientId : '';
    const requestedOrganizationId = typeof payload.organizationId === 'string' ? payload.organizationId : '';
    const requestedRole = payload.clientRole === 'admin' ? 'admin' : 'member';
    const clientRole = currentUser.client_role || currentUser.data?.client_role;
    const isPlatformAdmin = currentUser.role === 'admin';
    const clientId = isPlatformAdmin
      ? requestedClientId
      : (currentUser.client_id || currentUser.data?.client_id);

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!clientId) {
      return Response.json({ error: 'Your account is not assigned to a client organization.' }, { status: 400 });
    }

    if (!isPlatformAdmin && clientRole !== 'admin') {
      return Response.json({ error: 'Forbidden: Client admin or Platform Administrator access required.' }, { status: 403 });
    }

    const matchedUsers = await base44.asServiceRole.entities.User.filter({ email });
    const invitedUser = matchedUsers[0] || null;

    if (invitedUser) {
      const existingClientUsers = await base44.asServiceRole.entities.ClientUser.filter({ user_id: invitedUser.id, client_id: clientId });

      if (existingClientUsers.length > 0) {
        return Response.json({ error: 'This user is already a team member for this client.' }, { status: 409 });
      }

      const membership = await base44.asServiceRole.entities.ClientUser.create({
        user_id: invitedUser.id,
        client_id: clientId,
        organization_id: requestedOrganizationId || null,
        role: requestedRole,
        status: 'active',
        email: invitedUser.email,
        full_name: invitedUser.full_name || '',
      });

      return Response.json({
        success: true,
        invited_user_id: invitedUser.id,
        client_user_id: membership.id,
        invitation_status: 'active',
        message: 'Existing user added to this client successfully.',
      });
    }

    await base44.users.inviteUser(email, 'user');

    const pendingMembership = await base44.asServiceRole.entities.ClientUser.create({
      user_id: email,
      client_id: clientId,
      organization_id: requestedOrganizationId || null,
      role: requestedRole,
      status: 'pending',
      email,
      full_name: '',
    });

    return Response.json({
      success: true,
      invited_user_id: null,
      client_user_id: pendingMembership.id,
      invitation_status: 'pending',
      message: 'Invitation email sent successfully.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});