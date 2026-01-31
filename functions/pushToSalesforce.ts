import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
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

    // Get Salesforce access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("salesforce");
    const instanceUrl = Deno.env.get("SALESFORCE_INSTANCE_URL") || "https://na1.salesforce.com";

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