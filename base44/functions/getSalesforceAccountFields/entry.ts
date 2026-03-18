import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.client_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clients = await base44.asServiceRole.entities.Client.filter({ id: user.client_id });
    if (!clients || clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = clients[0];

    if (!client.salesforce_connected) {
      return Response.json({ error: 'Salesforce not connected' }, { status: 400 });
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
        return Response.json({ error: `Failed to refresh token: ${error}` }, { status: 401 });
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

    const describeUrl = `${client.salesforce_instance_url}/services/data/v58.0/sobjects/Account/describe`;
    const sfResponse = await fetch(describeUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!sfResponse.ok) {
      const error = await sfResponse.text();
      return Response.json({ error: `Salesforce API error: ${error}` }, { status: sfResponse.status });
    }

    const describeData = await sfResponse.json();

    // Filter to writable, non-system fields and return clean metadata
    const fields = describeData.fields
      .filter(f => !f.deprecatedAndHidden && f.createable)
      .map(f => ({
        name: f.name,
        label: f.label,
        type: f.type,
        length: f.length,
        required: !f.nillable && f.createable
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return Response.json({ success: true, fields });

  } catch (error) {
    console.error('getSalesforceAccountFields error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});