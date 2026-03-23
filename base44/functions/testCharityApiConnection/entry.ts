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

    const clientId = user?.data?.client_id;
    if (!clientId) {
      return Response.json({ success: false, error: 'Client not found for user' }, { status: 400 });
    }

    const payload = await req.json().catch(() => ({}));
    let apiKey = payload?.api_key?.trim();

    if (!apiKey) {
      const integrations = await base44.asServiceRole.entities.ClientIntegration.filter(
        { client_id: clientId, integration_type: 'CharityAPI', is_active: true },
        '-updated_date',
        1,
      );
      apiKey = integrations?.[0]?.api_key;
    }

    if (!apiKey) {
      return Response.json({ success: false, error: 'No CharityAPI key has been saved yet.' }, { status: 400 });
    }

    const response = await fetch(`https://api.charityapi.org/api/organizations/${TEST_EIN}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return Response.json({ success: false, error: 'CharityAPI rejected this API key.' }, { status: 400 });
    }

    if (!response.ok) {
      return Response.json({ success: false, error: `CharityAPI test failed with status ${response.status}.` }, { status: 400 });
    }

    const result = await response.json();
    const orgName = result?.data?.name || 'test organization';

    return Response.json({
      success: true,
      message: `CharityAPI connected successfully. Test lookup returned ${orgName}.`,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to test CharityAPI connection' }, { status: 500 });
  }
});