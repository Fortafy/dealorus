import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceBase44 = base44.asServiceRole;
    const pendingMemberships = await serviceBase44.entities.ClientUser.filter({
      email: currentUser.email,
      status: 'pending',
    }, '-created_date');
    const activeMemberships = await serviceBase44.entities.ClientUser.filter({
      email: currentUser.email,
      status: 'active',
    }, '-created_date');
    const preferredFullName = pendingMemberships[0]?.full_name || activeMemberships[0]?.full_name || currentUser.full_name || '';

    const activatedMemberships = [];

    for (const membership of pendingMemberships) {
      const updatedMembership = await serviceBase44.entities.ClientUser.update(membership.id, {
        user_id: currentUser.id,
        client_id: membership.client_id,
        email: currentUser.email,
        full_name: membership.full_name || preferredFullName,
        status: 'active',
      });

      activatedMemberships.push(updatedMembership);
    }

    const linkedActiveMemberships = [];

    for (const membership of activeMemberships) {
      if (!membership.user_id || membership.user_id !== currentUser.id || !membership.full_name) {
        const updatedMembership = await serviceBase44.entities.ClientUser.update(membership.id, {
          user_id: currentUser.id,
          full_name: membership.full_name || preferredFullName,
          email: currentUser.email,
        });
        linkedActiveMemberships.push(updatedMembership);
      } else {
        linkedActiveMemberships.push(membership);
      }
    }

    const allMemberships = [...activatedMemberships, ...linkedActiveMemberships];
    const primaryMembership = allMemberships[0] || null;

    if (primaryMembership) {
      const client = await serviceBase44.entities.Client.get(primaryMembership.client_id);

      await serviceBase44.auth.admin.updateUser(currentUser.id, {
        full_name: preferredFullName,
        client_id: primaryMembership.client_id,
        active_client_id: primaryMembership.client_id,
        client_role: primaryMembership.role,
        client_name: client?.name || currentUser.client_name || '',
      });
    }

    return Response.json({
      success: true,
      activated_count: activatedMemberships.length,
      memberships: activatedMemberships,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});