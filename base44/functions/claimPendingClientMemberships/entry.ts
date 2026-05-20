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

    const activatedMemberships = [];

    for (const membership of pendingMemberships) {
      const updatedMembership = await serviceBase44.entities.ClientUser.update(membership.id, {
        user_id: currentUser.id,
        client_id: membership.client_id,
        email: currentUser.email,
        full_name: currentUser.full_name || membership.full_name || '',
        status: 'active',
      });

      activatedMemberships.push(updatedMembership);
    }

    const primaryMembership = activatedMemberships[0] || (await serviceBase44.entities.ClientUser.filter({
      user_id: currentUser.id,
      status: 'active',
    }, '-created_date'))[0] || null;

    if (primaryMembership) {
      const client = await serviceBase44.entities.Client.get(primaryMembership.client_id);

      await base44.auth.updateMe({
        client_id: primaryMembership.client_id,
        active_client_id: primaryMembership.client_id,
        client_role: primaryMembership.role,
        client_name: client?.name || currentUser.client_name || '',
        full_name: currentUser.full_name || primaryMembership.full_name || '',
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