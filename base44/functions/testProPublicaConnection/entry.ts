import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin' || user?.data?.client_role === 'admin';
    if (!isAdmin) {
      return Response.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const clientId = user?.data?.client_id;
    if (!clientId) {
      return Response.json({ success: false, error: 'Client not found for user' }, { status: 400 });
    }

    const integrations = await base44.asServiceRole.entities.ClientIntegration.filter(
      { client_id: clientId, integration_type: 'ProPublica', is_active: true },
      '-updated_date',
      1,
    );

    const apiKey = integrations?.[0]?.api_key;
    const headers = apiKey ? { 'X-API-Key': apiKey } : undefined;

    const response = await fetch('https://projects.propublica.org/nonprofits/api/v2/search.json?q=american%20red%20cross', {
      headers,
    });

    if (!response.ok) {
      return Response.json({ success: false, error: `ProPublica test failed with status ${response.status}.` }, { status: 400 });
    }

    const result = await response.json();
    const orgName = result?.organizations?.[0]?.name || 'a nonprofit result';

    return Response.json({
      success: true,
      message: `ProPublica connected successfully. Test search returned ${orgName}.`,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to test ProPublica connection' }, { status: 500 });
  }
});