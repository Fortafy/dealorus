import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const TEST_EIN = '530196605';
const SUPPORTED_INTEGRATIONS = ['CharityAPI', 'ProPublica', 'NonprofitCheckPlus'];

async function readPayload(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function testCharityApi(apiKey) {
  const response = await fetch(`https://api.charityapi.org/api/organizations/${TEST_EIN}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('CharityAPI rejected the saved API key.');
  }

  if (!response.ok) {
    throw new Error(`CharityAPI test failed with status ${response.status}.`);
  }

  return 'CharityAPI connection is working.';
}

async function testNonprofitCheckPlus(apiKey) {
  const response = await fetch(`https://entities.pactman.org/api/entities/nonprofitcheck/v1/us/ein/${TEST_EIN}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Nonprofit Check Plus rejected the saved API key.');
  }

  if (!response.ok) {
    throw new Error(`Nonprofit Check Plus test failed with status ${response.status}.`);
  }

  return 'Nonprofit Check Plus connection is working.';
}

async function testProPublica() {
  const response = await fetch('https://projects.propublica.org/nonprofits/api/v2/search.json?q=american%20red%20cross');

  if (!response.ok) {
    throw new Error(`ProPublica test failed with status ${response.status}.`);
  }

  const data = await response.json();
  const resultCount = Array.isArray(data.organizations) ? data.organizations.length : 0;

  if (resultCount === 0) {
    return 'ProPublica is reachable, but the test search returned no results.';
  }

  return 'ProPublica is reachable and returned search results.';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = user?.data?.client_id;
    if (!clientId) {
      return Response.json({ success: false, error: 'Client not found for user' }, { status: 400 });
    }

    const { integration_type } = await readPayload(req);

    if (!SUPPORTED_INTEGRATIONS.includes(integration_type)) {
      return Response.json({ success: false, error: 'Unsupported integration type' }, { status: 400 });
    }

    if (integration_type === 'ProPublica') {
      const message = await testProPublica();
      return Response.json({ success: true, message });
    }

    const integrations = await base44.asServiceRole.entities.ClientIntegration.filter(
      { client_id: clientId, integration_type },
      '-updated_date',
      1,
    );

    const apiKey = integrations?.[0]?.api_key;
    if (!apiKey) {
      return Response.json({ success: false, error: `No ${integration_type} API key has been saved yet.` }, { status: 400 });
    }

    const message = integration_type === 'CharityAPI'
      ? await testCharityApi(apiKey)
      : await testNonprofitCheckPlus(apiKey);

    return Response.json({ success: true, message });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Connection test failed' }, { status: 500 });
  }
});