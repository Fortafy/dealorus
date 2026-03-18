import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ein } = await req.json();
    
    if (!ein) {
      return Response.json({ error: 'EIN is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('CHARITY_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'CHARITY_API_KEY not configured' }, { status: 500 });
    }

    // Fetch from CharityAPI
    const response = await fetch(`https://api.charityapi.org/api/organizations/${ein}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      return Response.json({ 
        error: 'Organization not found in CharityAPI',
        ein 
      }, { status: 404 });
    }

    const result = await response.json();
    const org = result.data;

    if (!org) {
      return Response.json({ 
        error: 'Organization not found',
        ein 
      }, { status: 404 });
    }

    // Convert tax_period (format: YYYYMM) to date (YYYY-MM-01)
    let source_updated_date = null;
    if (org.tax_period) {
      const taxPeriodStr = org.tax_period.toString();
      if (taxPeriodStr.length === 6) {
        const year = taxPeriodStr.substring(0, 4);
        const month = taxPeriodStr.substring(4, 6);
        source_updated_date = `${year}-${month}-01`;
      }
    }

    // Map CharityAPI data to our schema
    const mapped = {
      organization_name: org.name || null,
      state: org.state || null,
      ein: org.ein || null,
      address: org.street || null,
      city: org.city || null,
      zip_code: org.zip || null,
      phone: null, // CharityAPI doesn't provide phone
      email: null, // CharityAPI doesn't provide email
      website: null, // CharityAPI doesn't provide website
      organization_type: org.subsection === 3 ? '501(c)(3) Public Charity' : 'Other Nonprofit',
      mission: null, // CharityAPI doesn't provide mission
      annual_revenue: org.revenue_amt ? `$${org.revenue_amt.toLocaleString()}` : null,
      ntee_code: org.ntee_cd || null,
      ntee_description: null, // Will be populated on frontend
      ruling_date: org.ruling ? `${org.ruling.toString().substring(0, 4)}-${org.ruling.toString().substring(4, 6)}-01` : null,
      source_subseccd_code: org.subsection ? org.subsection.toString() : null,
      source_updated_date: source_updated_date,
      data_sources: ['CharityAPI']
    };

    return Response.json(mapped);

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Failed to fetch from CharityAPI' 
    }, { status: 500 });
  }
});