import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keepId, mergeIds, mergedData } = await req.json();

    if (!keepId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
      return Response.json({ error: 'keepId and mergeIds array are required' }, { status: 400 });
    }

    // Update the primary organization with merged data
    if (mergedData) {
      await base44.asServiceRole.entities.Organization.update(keepId, mergedData);
    }

    // Reparent all contacts from duplicate organizations to the primary
    for (const mergeId of mergeIds) {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ organization_id: mergeId });
      
      for (const contact of contacts) {
        await base44.asServiceRole.entities.Contact.update(contact.id, {
          organization_id: keepId
        });
      }

      // Delete the duplicate organization
      await base44.asServiceRole.entities.Organization.delete(mergeId);
    }

    return Response.json({ 
      success: true,
      message: `Successfully merged ${mergeIds.length} organization(s) into primary record`,
      contactsReparented: mergeIds.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});