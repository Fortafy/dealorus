import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    const serviceBase44 = base44.asServiceRole;

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const requestedClientId = typeof payload.clientId === 'string' ? payload.clientId : '';
    const requestedOrganizationId = typeof payload.organizationId === 'string' ? payload.organizationId : '';
    const requestedRole = payload.clientRole === 'admin' ? 'admin' : 'member';
    const clientRole = currentUser.client_role || currentUser.data?.client_role;
    const isPlatformAdmin = currentUser.role === 'admin';
    const clientId = isPlatformAdmin
      ? requestedClientId
      : (currentUser.client_id || currentUser.data?.client_id);

    if (!fullName) {
      return Response.json({ error: 'Please enter a full name.' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!clientId) {
      return Response.json({ error: 'Your account is not assigned to a client organization.' }, { status: 400 });
    }

    if (!isPlatformAdmin && clientRole !== 'admin') {
      return Response.json({ error: 'Forbidden: Client admin or Platform Administrator access required.' }, { status: 403 });
    }

    const existingClientUsers = await serviceBase44.entities.ClientUser.filter({ client_id: clientId, email });
    const existingMembership = existingClientUsers.find((membership) => membership.status !== 'inactive') || null;
    const matchedUsers = await serviceBase44.entities.User.filter({ email });
    const invitedUser = matchedUsers[0] || null;

    if (existingMembership) {
      if (existingMembership.status === 'active' || existingMembership.user_id === invitedUser?.id) {
        return Response.json({ error: 'This user is already a team member for this client.' }, { status: 409 });
      }

      const updatedPendingMembership = await serviceBase44.entities.ClientUser.update(existingMembership.id, {
        role: requestedRole,
        organization_id: requestedOrganizationId || null,
        full_name: fullName,
      });

      return Response.json({
        success: true,
        invited_user_id: invitedUser?.id || null,
        client_user_id: updatedPendingMembership.id,
        invitation_status: updatedPendingMembership.status,
        message: 'This invitation already exists for this client.',
      });
    }

    if (invitedUser) {
      const membership = await serviceBase44.entities.ClientUser.create({
        user_id: invitedUser.id,
        client_id: clientId,
        organization_id: requestedOrganizationId || null,
        role: requestedRole,
        status: 'active',
        email: invitedUser.email,
        full_name: fullName,
      });

      await serviceBase44.auth.admin.updateUser(invitedUser.id, {
        full_name: fullName,
        client_id: clientId,
        active_client_id: clientId,
        client_role: requestedRole,
        client_name: '',
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

    const refreshedMatchedUsers = await serviceBase44.entities.User.filter({ email });
    const createdUser = refreshedMatchedUsers[0] || null;

    const pendingMembership = await serviceBase44.entities.ClientUser.create({
      user_id: createdUser?.id || '',
      client_id: clientId,
      organization_id: requestedOrganizationId || null,
      role: requestedRole,
      status: 'pending',
      email,
      full_name: fullName,
    });

    if (createdUser?.id) {
      await serviceBase44.auth.admin.updateUser(createdUser.id, {
        full_name: fullName,
        client_id: clientId,
        active_client_id: clientId,
        client_role: requestedRole,
        client_name: '',
      });
    }

    return Response.json({
      success: true,
      invited_user_id: createdUser?.id || null,
      client_user_id: pendingMembership.id,
      invitation_status: 'pending',
      message: 'Invitation email sent successfully.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});