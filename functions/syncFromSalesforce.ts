import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Salesforce access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("salesforce");

    // Get Salesforce instance URL from the token introspection or use a default
    const instanceUrl = Deno.env.get("SALESFORCE_INSTANCE_URL") || "https://na1.salesforce.com";

    // Fetch Accounts from Salesforce
    const sfQuery = `SELECT Id, Name, BillingState, Phone, BillingStreet, BillingCity, BillingPostalCode, Website, Industry, AnnualRevenue, Description FROM Account`;
    const queryUrl = `${instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(sfQuery)}`;

    const sfResponse = await fetch(queryUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!sfResponse.ok) {
      const error = await sfResponse.text();
      return Response.json({ error: `Salesforce API error: ${error}` }, { status: sfResponse.status });
    }

    const sfData = await sfResponse.json();
    const accounts = sfData.records || [];

    // Sync each Account to Organization entity
    const syncedOrgs = [];
    for (const account of accounts) {
      // Check if organization already exists by salesforce_id
      const existing = await base44.asServiceRole.entities.Organization.filter({
        salesforce_id: account.Id,
        client_id: user.client_id
      });

      const orgData = {
        client_id: user.client_id,
        user_id: user.id,
        organization_name: account.Name,
        state: account.BillingState || '',
        phone: account.Phone || '',
        address: account.BillingStreet || '',
        city: account.BillingCity || '',
        zip_code: account.BillingPostalCode || '',
        website: account.Website || '',
        organization_type: account.Industry || '',
        mission: account.Description || '',
        annual_revenue: account.AnnualRevenue ? account.AnnualRevenue.toString() : '',
        source_system: 'Salesforce',
        salesforce_id: account.Id,
        last_salesforce_sync: new Date().toISOString()
      };

      if (existing.length > 0) {
        // Update existing
        const updated = await base44.asServiceRole.entities.Organization.update(existing[0].id, orgData);
        syncedOrgs.push(updated);
      } else {
        // Create new
        const created = await base44.asServiceRole.entities.Organization.create(orgData);
        syncedOrgs.push(created);
      }
    }

    return Response.json({
      success: true,
      synced_count: syncedOrgs.length,
      organizations: syncedOrgs
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});