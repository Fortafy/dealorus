import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    const org = await base44.entities.Organization.filter({ id: organization_id });
    
    if (!org || org.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organization = org[0];

    if (!organization.salesforce_id) {
      return Response.json({ error: 'Organization does not have a Salesforce ID' }, { status: 400 });
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

    // Map Organization fields to Salesforce Account fields
    const sfAccountData = {
      Name: organization.organization_name,
      BillingState: organization.state,
      Phone: organization.phone,
      BillingStreet: organization.address,
      BillingCity: organization.city,
      BillingPostalCode: organization.zip_code,
      Website: organization.website,
      Industry: organization.organization_type,
      Description: organization.mission,
      AnnualRevenue: organization.annual_revenue ? parseFloat(organization.annual_revenue) : null,
      // Custom fields for enhanced data
      Lifecycle_Stage__c: organization.lifecycle_stage,
      Is_Client__c: organization.is_client,
      Deal_Value__c: organization.deal_value,
      Next_Activity_Date__c: organization.next_activity_date,
      EIN__c: organization.ein,
      NTEE_Code__c: organization.ntee_code
    };

    // Update Salesforce Account
    const updateUrl = `${instanceUrl}/services/data/v58.0/sobjects/Account/${organization.salesforce_id}`;
    
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
      return Response.json({ 
        error: `Salesforce API error: ${error}`,
        note: 'Some custom fields may not exist in your Salesforce org. Create them or remove from mapping.'
      }, { status: sfResponse.status });
    }

    // Update last sync time in our database
    await base44.asServiceRole.entities.Organization.update(organization_id, {
      last_salesforce_sync: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Organization successfully pushed to Salesforce',
      salesforce_id: organization.salesforce_id
    });

  } catch (error) {
    console.error('Push error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});