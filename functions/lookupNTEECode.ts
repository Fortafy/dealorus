import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the NTEE code from the request payload
    const { code } = await req.json();
    
    if (!code) {
      return Response.json({ error: 'NTEE code is required' }, { status: 400 });
    }

    const upperCode = code.toUpperCase().trim();
    const apiKey = Deno.env.get('CHARITY_API_KEY');

    if (!apiKey) {
      return Response.json({ error: 'CHARITY_API_KEY not configured' }, { status: 500 });
    }

    // Fetch from CharityAPI
    const response = await fetch(`https://api.charityapi.org/api/ntee_codes/${upperCode}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      return Response.json({ 
        error: 'NTEE code not found',
        code: upperCode 
      }, { status: 404 });
    }

    const data = await response.json();
    
    return Response.json({
      code: data.code || upperCode,
      description: data.title || null
    });

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Failed to lookup NTEE code' 
    }, { status: 500 });
  }
});