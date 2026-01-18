import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    
    if (!code) {
      return Response.json({ error: 'NTEE code is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('CHARITY_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'CHARITY_API_KEY not configured' }, { status: 500 });
    }

    // Fetch from CharityAPI NTEE codes endpoint
    const response = await fetch(`https://api.charityapi.org/api/ntee_codes/?code=${code.toUpperCase()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      return Response.json({ 
        valid: false,
        error: 'Failed to validate NTEE code' 
      }, { status: response.status });
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      const nteeData = data[0];
      return Response.json({
        valid: true,
        code: nteeData.code,
        description: nteeData.description || nteeData.name || null
      });
    } else {
      return Response.json({
        valid: false,
        code: code
      });
    }

  } catch (error) {
    return Response.json({ 
      valid: false,
      error: error.message || 'Failed to validate NTEE code' 
    }, { status: 500 });
  }
});