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

    const apiKey = Deno.env.get('NONPROFIT_CHECK_PLUS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'NONPROFIT_CHECK_PLUS_API_KEY not configured' }, { status: 500 });
    }

    // Remove hyphens from EIN
    const cleanEin = ein.replace(/-/g, '');

    // Fetch from Nonprofit Check Plus API
    const response = await fetch(`https://entities.pactman.org/api/entities/nonprofitcheck/v1/us/ein/${cleanEin}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      return Response.json({ 
        error: 'Organization not found in Nonprofit Check Plus',
        ein 
      }, { status: 404 });
    }

    const result = await response.json();
    const org = result.data || result;

    if (!org) {
      return Response.json({ 
        error: 'Organization not found',
        ein 
      }, { status: 404 });
    }

    // Map Nonprofit Check Plus data to our schema
    const mapped = {
      organization_name: org.organization_name || org.name || null,
      state: org.state || null,
      ein: org.ein || null,
      address: org.address || org.street || null,
      city: org.city || null,
      zip_code: org.zip_code || org.zip || null,
      phone: org.phone || null,
      email: org.email || null,
      website: org.website || null,
      organization_type: org.organization_type || (org.subsection === '3' || org.subsection === 3 ? '501(c)(3) Public Charity' : 'Other Nonprofit'),
      mission: org.mission || null,
      annual_revenue: org.annual_revenue || (org.revenue_amt ? `$${org.revenue_amt.toLocaleString()}` : null),
      ntee_code: org.ntee_code || org.ntee_cd || null,
      ntee_description: null, // Will be populated on frontend
      ruling_date: org.ruling_date || null,
      source_updated_date: org.organization_info_last_modified || null,
      source_subseccd_code: org.bmf_subsection ? org.bmf_subsection.toString() : null,
      data_sources: ['Nonprofit Check Plus']
    };

    return Response.json(mapped);

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Failed to fetch from Nonprofit Check Plus' 
    }, { status: 500 });
  }
});