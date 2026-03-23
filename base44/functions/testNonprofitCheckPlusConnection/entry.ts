import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const TEST_EIN = '530196605';

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

    const payload = await req.json().catch(() => ({}));
    const clientId = payload?.client_id || user?.data?.client_id;
    if (!clientId) {
      return Response.json({ success: false, error: 'Client not found for this test request.' }, { status: 400 });
    }

    let apiKey = payload?.api_key?.trim();

    if (!apiKey) {
      const integrations = await base44.asServiceRole.entities.ClientIntegration.filter(
        { client_id: clientId, integration_type: 'NonprofitCheckPlus', is_active: true },
        '-updated_date',
        1,
      );
      apiKey = integrations?.[0]?.api_key;
    }

    if (!apiKey) {
      return Response.json({ success: false, error: 'No Nonprofit Check Plus key has been saved yet.' }, { status: 400 });
    }

    const response = await fetch(`https://entities.pactman.org/api/entities/nonprofitcheck/v1/us/ein/${TEST_EIN}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return Response.json({ success: false, error: 'Nonprofit Check Plus rejected this API key.' }, { status: 400 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ success: false, error: errorText || `Nonprofit Check Plus test failed with status ${response.status}.` }, { status: 400 });
    }

    const result = await response.json();
    const orgName = result?.data?.organization_name || result?.data?.name || result?.organization_name || 'test organization';

    return Response.json({
      success: true,
      message: `Nonprofit Check Plus connected successfully. Test lookup returned ${orgName}.`,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to test Nonprofit Check Plus connection' }, { status: 500 });
  }
});