import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search parameters from the request payload
    const { organizationName, state, city } = await req.json();
    
    if (!organizationName) {
      return Response.json({ error: 'Organization name is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('CHARITY_API_KEY');

    if (!apiKey) {
      return Response.json({ error: 'CHARITY_API_KEY not configured' }, { status: 500 });
    }

    // Build the URL with query parameters
    const url = new URL(`https://api.charityapi.org/api/organizations/search/${encodeURIComponent(organizationName)}`);
    if (state) url.searchParams.append('state', state);
    if (city) url.searchParams.append('city', city);

    // Fetch from CharityAPI
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`CharityAPI error: ${response.status} - ${errorText}`);
      return Response.json({ 
        error: 'Organization search failed',
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    
    return Response.json(data);

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Failed to search organizations' 
    }, { status: 500 });
  }
});