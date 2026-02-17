import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.client_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { instance_url, consumer_key, consumer_secret } = await req.json();

    if (!instance_url || !consumer_key || !consumer_secret) {
      return Response.json({ 
        error: 'Missing required fields: instance_url, consumer_key, consumer_secret' 
      }, { status: 400 });
    }

    // Validate instance URL format
    const cleanInstanceUrl = instance_url.trim().replace(/\/$/, '');
    if (!cleanInstanceUrl.startsWith('https://')) {
      return Response.json({ 
        error: 'Instance URL must start with https://' 
      }, { status: 400 });
    }

    // OAuth 2.0 Client Credentials Flow
    // Exchange consumer key and secret for access token
    const tokenUrl = `${cleanInstanceUrl}/services/oauth2/token`;
    const tokenParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: consumer_key,
      client_secret: consumer_secret
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
        error: `Salesforce authentication failed: ${error}. Please verify your credentials and External Client App configuration.` 
      }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return Response.json({ 
        error: 'Failed to obtain access token from Salesforce' 
      }, { status: 500 });
    }

    // Calculate token expiry (typically 2 hours for client credentials)
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + (tokenData.expires_in || 7200));

    // Test the connection by making a simple API call
    const testUrl = `${tokenData.instance_url || cleanInstanceUrl}/services/data/v58.0/limits`;
    const testResponse = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!testResponse.ok) {
      return Response.json({ 
        error: 'Access token obtained but failed to connect to Salesforce API. Check permissions.' 
      }, { status: 500 });
    }

    // Store credentials in Client entity
    await base44.asServiceRole.entities.Client.update(user.client_id, {
      salesforce_connected: true,
      salesforce_instance_url: tokenData.instance_url || cleanInstanceUrl,
      salesforce_consumer_key: consumer_key, // In production, encrypt this
      salesforce_consumer_secret: consumer_secret, // In production, encrypt this
      salesforce_access_token: tokenData.access_token, // In production, encrypt this
      salesforce_token_expiry: expiryDate.toISOString()
    });

    return Response.json({
      success: true,
      message: 'External Client App connected successfully',
      instance_url: tokenData.instance_url || cleanInstanceUrl,
      token_expiry: expiryDate.toISOString()
    });

  } catch (error) {
    console.error('Connection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});