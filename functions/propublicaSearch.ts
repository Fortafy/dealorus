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

    // Remove hyphens from EIN for ProPublica API
    const cleanEin = ein.replace(/-/g, '');

    // Fetch from ProPublica Nonprofit Explorer API
    const response = await fetch(`https://projects.propublica.org/nonprofits/api/v2/organizations/${cleanEin}.json`);

    if (!response.ok) {
      return Response.json({ 
        error: 'Organization not found in ProPublica',
        ein 
      }, { status: 404 });
    }

    const result = await response.json();
    const org = result.organization;

    if (!org) {
      return Response.json({ 
        error: 'Organization not found',
        ein 
      }, { status: 404 });
    }

    // Map ProPublica data to our schema
    const mapped = {
      organization_name: org.name || null,
      state: org.state || null,
      ein: org.ein ? org.ein.toString() : null,
      address: org.address || null,
      city: org.city || null,
      zip_code: org.zipcode || null,
      phone: null, // ProPublica doesn't provide phone in API
      email: null, // ProPublica doesn't provide email in API
      website: null, // ProPublica doesn't provide website in API
      organization_type: org.subsection_code === 3 ? '501(c)(3) Public Charity' : 'Other Nonprofit',
      mission: null, // ProPublica doesn't provide mission in API
      annual_revenue: org.revenue_amount ? `$${org.revenue_amount.toLocaleString()}` : null,
      ntee_code: org.ntee_code || null,
      ntee_description: null, // Will be populated on frontend
      ruling_date: org.ruling_date || null,
      data_sources: ['ProPublica']
    };

    return Response.json(mapped);

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Failed to fetch from ProPublica' 
    }, { status: 500 });
  }
});