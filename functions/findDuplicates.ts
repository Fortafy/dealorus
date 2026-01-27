import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Get all organizations for this client
    const organizations = await base44.asServiceRole.entities.Organization.filter({ client_id });

    // Find potential duplicates
    const duplicateGroups = [];
    const processed = new Set();

    for (let i = 0; i < organizations.length; i++) {
      if (processed.has(organizations[i].id)) continue;

      const org1 = organizations[i];
      const matches = [];

      for (let j = i + 1; j < organizations.length; j++) {
        if (processed.has(organizations[j].id)) continue;

        const org2 = organizations[j];
        const matchReasons = [];

        // Check for matches
        const nameMatch = org1.organization_name?.toLowerCase().trim() === org2.organization_name?.toLowerCase().trim();
        const einMatch = org1.ein && org2.ein && org1.ein.replace(/\D/g, '') === org2.ein.replace(/\D/g, '');
        const stateMatch = org1.state?.toLowerCase() === org2.state?.toLowerCase();
        const cityMatch = org1.city?.toLowerCase().trim() === org2.city?.toLowerCase().trim();

        // Duplicate criteria: (Name + State + City) OR (EIN match)
        if (einMatch) {
          matchReasons.push('EIN');
        }
        if (nameMatch) {
          matchReasons.push('Name');
        }
        if (stateMatch) {
          matchReasons.push('State');
        }
        if (cityMatch) {
          matchReasons.push('City');
        }

        // Consider it a duplicate if EIN matches OR (Name + State + City all match)
        if (einMatch || (nameMatch && stateMatch && cityMatch && org1.city)) {
          matches.push({
            organization: org2,
            matchReasons
          });
          processed.add(org2.id);
        }
      }

      if (matches.length > 0) {
        duplicateGroups.push({
          primary: org1,
          duplicates: matches
        });
        processed.add(org1.id);
      }
    }

    return Response.json({ 
      duplicateGroups,
      totalOrganizations: organizations.length,
      duplicatesFound: duplicateGroups.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});