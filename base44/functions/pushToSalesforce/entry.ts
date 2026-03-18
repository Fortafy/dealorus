import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.client_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Get organization from database
    const orgs = await base44.entities.Organization.filter({ id: organization_id });
    if (!orgs || orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    const organization = orgs[0];

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

    // Check / refresh token
    let accessToken = client.salesforce_access_token;
    const tokenExpiry = client.salesforce_token_expiry ? new Date(client.salesforce_token_expiry) : null;
    const now = new Date();

    if (!accessToken || !tokenExpiry || now >= tokenExpiry) {
      const tokenUrl = `${client.salesforce_instance_url}/services/oauth2/token`;
      const tokenParams = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: client.salesforce_consumer_key,
        client_secret: client.salesforce_consumer_secret
      });

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

      const newExpiry = new Date();
      newExpiry.setSeconds(newExpiry.getSeconds() + (tokenData.expires_in || 7200));

      await base44.asServiceRole.entities.Client.update(client.id, {
        salesforce_access_token: accessToken,
        salesforce_token_expiry: newExpiry.toISOString()
      });
    }

    const instanceUrl = client.salesforce_instance_url;

    // Load active field mappings for this client
    const mappings = await base44.asServiceRole.entities.SalesforceFieldMapping.filter({
      client_id: user.client_id,
      is_active: true
    });

    // Build the Salesforce Account payload from dynamic mappings
    const sfAccountData = {};
    for (const mapping of mappings) {
      const localValue = organization[mapping.dealorous_field];
      if (localValue === undefined || localValue === null || localValue === '') continue;

      // Type coerce based on Salesforce field type
      if (mapping.salesforce_field_type === 'double' || mapping.salesforce_field_type === 'currency') {
        const parsed = parseFloat(localValue);
        if (!isNaN(parsed)) sfAccountData[mapping.salesforce_field] = parsed;
      } else if (mapping.salesforce_field_type === 'boolean') {
        sfAccountData[mapping.salesforce_field] = Boolean(localValue);
      } else {
        sfAccountData[mapping.salesforce_field] = String(localValue);
      }
    }

    // If no mappings configured, fall back to a sensible default (Name is required)
    if (Object.keys(sfAccountData).length === 0) {
      sfAccountData['Name'] = organization.organization_name;
    }

    // Ensure Name is always included
    if (!sfAccountData['Name']) {
      sfAccountData['Name'] = organization.organization_name;
    }

    let salesforceId = organization.salesforce_id;
    let isCreate = false;

    // If no salesforce_id stored locally, search Salesforce for an existing Account by EIN or Name
    if (!salesforceId) {
      let soql = null;

      if (organization.ein) {
        // Normalize EIN to digits only, and also produce hyphenated format XX-XXXXXXX
        const einNormalized = organization.ein.replace(/-/g, '');
        const einHyphenated = einNormalized.length === 9
          ? `${einNormalized.slice(0, 2)}-${einNormalized.slice(2)}`
          : organization.ein;
        // Search both formats so we match regardless of how Salesforce stores the EIN
        soql = `SELECT Id FROM Account WHERE AccountNumber = '${einNormalized}' OR AccountNumber = '${einHyphenated}' LIMIT 1`;
      }

      // If no EIN or EIN search yields nothing, fall back to name match
      if (!soql) {
        const safeName = organization.organization_name.replace(/'/g, "\\'");
        soql = `SELECT Id FROM Account WHERE Name = '${safeName}' LIMIT 1`;
      }

      const queryUrl = `${instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(soql)}`;
      const queryResponse = await fetch(queryUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (queryResponse.ok) {
        const queryResult = await queryResponse.json();
        if (queryResult.records && queryResult.records.length > 0) {
          salesforceId = queryResult.records[0].Id;
        }
      }

      // If still not found by EIN, try name search as fallback
      if (!salesforceId && organization.ein) {
        const safeName = organization.organization_name.replace(/'/g, "\\'");
        const nameQueryUrl = `${instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(`SELECT Id FROM Account WHERE Name = '${safeName}' LIMIT 1`)}`;
        const nameQueryResponse = await fetch(nameQueryUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (nameQueryResponse.ok) {
          const nameQueryResult = await nameQueryResponse.json();
          if (nameQueryResult.records && nameQueryResult.records.length > 0) {
            salesforceId = nameQueryResult.records[0].Id;
          }
        }
      }
    }

    if (salesforceId) {
      // UPDATE existing Account
      const updateUrl = `${instanceUrl}/services/data/v58.0/sobjects/Account/${salesforceId}`;
      const sfResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sfAccountData)
      });

      if (!sfResponse.ok) {
        const error = await sfResponse.text();
        return Response.json({ error: `Salesforce update error: ${error}` }, { status: sfResponse.status });
      }
    } else {
      // No match found — CREATE new Account
      isCreate = true;
      const createUrl = `${instanceUrl}/services/data/v58.0/sobjects/Account`;
      const sfResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sfAccountData)
      });

      if (!sfResponse.ok) {
        const error = await sfResponse.text();
        return Response.json({ error: `Salesforce create error: ${error}` }, { status: sfResponse.status });
      }

      const createResult = await sfResponse.json();
      salesforceId = createResult.id;
    }

    // Update local organization record with salesforce_id and sync timestamp
    await base44.asServiceRole.entities.Organization.update(organization_id, {
      salesforce_id: salesforceId,
      last_salesforce_sync: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: isCreate
        ? 'Account created in Salesforce successfully'
        : 'Account updated in Salesforce successfully',
      salesforce_id: salesforceId,
      is_create: isCreate
    });

  } catch (error) {
    console.error('Push error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});