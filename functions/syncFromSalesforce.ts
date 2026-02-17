import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.client_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client's Salesforce credentials
    const clients = await base44.asServiceRole.entities.Client.filter({ id: user.client_id });
    if (!clients || clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = clients[0];
    
    if (!client.salesforce_connected) {
      return Response.json({ 
        error: 'Salesforce External Client App not connected. Please connect in Organization Settings.' 
      }, { status: 400 });
    }

    // Check if token is expired and refresh if needed
    let accessToken = client.salesforce_access_token;
    const tokenExpiry = client.salesforce_token_expiry ? new Date(client.salesforce_token_expiry) : null;
    const now = new Date();

    if (!accessToken || !tokenExpiry || now >= tokenExpiry) {
      // Refresh token using client credentials flow
      const tokenUrl = `${client.salesforce_instance_url}/services/oauth2/token`;
      const tokenParams = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: client.salesforce_consumer_key,
        client_secret: client.salesforce_consumer_secret
      });

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        return Response.json({ 
          error: `Failed to refresh access token: ${error}. Please reconnect Salesforce.` 
        }, { status: 401 });
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;

      // Update stored token
      const newExpiry = new Date();
      newExpiry.setSeconds(newExpiry.getSeconds() + (tokenData.expires_in || 7200));
      
      await base44.asServiceRole.entities.Client.update(client.id, {
        salesforce_access_token: accessToken,
        salesforce_token_expiry: newExpiry.toISOString()
      });
    }

    const instanceUrl = client.salesforce_instance_url;

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

    // Update last sync time
    await base44.asServiceRole.entities.Client.update(client.id, {
      salesforce_last_sync: new Date().toISOString()
    });

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