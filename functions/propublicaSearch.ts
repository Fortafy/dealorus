import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ein, state, city } = await req.json();
    
    console.log('ProPublica function received:', { ein, state, city });

    // If EIN is provided, use the organization lookup endpoint
    if (ein) {
      const cleanEin = ein.replace(/-/g, '');
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

      const mapped = {
        organization_name: org.name || null,
        state: org.state || null,
        ein: org.ein ? org.ein.toString() : null,
        address: org.address || null,
        city: org.city || null,
        zip_code: org.zipcode || null,
        phone: null,
        email: null,
        website: null,
        organization_type: org.subsection_code === 3 ? '501(c)(3) Public Charity' : 'Other Nonprofit',
        mission: null,
        annual_revenue: org.revenue_amount ? `$${org.revenue_amount.toLocaleString()}` : null,
        ntee_code: org.ntee_code || null,
        ntee_description: null,
        ruling_date: org.ruling_date || null,
        data_sources: ['ProPublica']
      };

      return Response.json(mapped);
    }

    // Use ProPublica search endpoint for state/city queries
    const { orgName, orgType, nteeDescription } = await req.json();
    
    if (!state) {
      return Response.json({ error: 'Either EIN or state is required' }, { status: 400 });
    }

    const searchParams = new URLSearchParams();
    searchParams.append('state%5Bid%5D', state);
    
    if (orgName || city) {
      searchParams.append('q', city || orgName);
    }
    
    // Map organization type to c_code[id]
    if (orgType) {
      const orgTypeMap = {
        '501c3': '3',
        'foundation': '3', // Private foundations are also 501(c)(3)
        '501c4': '4',
        '501c6': '6'
      };
      if (orgTypeMap[orgType]) {
        searchParams.append('c_code%5Bid%5D', orgTypeMap[orgType]);
      }
    }
    
    // Map NTEE category to ntee[id]
    if (nteeDescription) {
      const nteeMap = {
        'arts': '1',
        'culture': '1',
        'humanities': '1',
        'education': '2',
        'environment': '3',
        'animals': '3',
        'health': '4',
        'human services': '5',
        'international': '6',
        'foreign affairs': '6',
        'public': '7',
        'societal benefit': '7',
        'religion': '8',
        'mutual': '9',
        'membership': '9'
      };
      const lowerNtee = nteeDescription.toLowerCase();
      for (const [key, value] of Object.entries(nteeMap)) {
        if (lowerNtee.includes(key)) {
          searchParams.append('ntee%5Bid%5D', value);
          break;
        }
      }
    }

    console.log('ProPublica search URL:', `https://projects.propublica.org/nonprofits/api/v2/search.json?${searchParams.toString()}`);

    const response = await fetch(`https://projects.propublica.org/nonprofits/api/v2/search.json?${searchParams.toString()}`);

    if (!response.ok) {
      console.error('ProPublica API error:', response.status, response.statusText);
      return Response.json({ 
        error: 'Failed to search ProPublica',
        status: response.status 
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('ProPublica search result:', result);

    const organizations = result.organizations || [];

    const mapped = organizations.map(org => ({
      organization_name: org.name || null,
      state: org.state || null,
      ein: org.ein ? org.ein.toString() : null,
      address: org.straddress || null,
      city: org.city || null,
      zip_code: org.zipcode || null,
      phone: null,
      email: null,
      website: null,
      organization_type: org.subseccd === 3 ? '501(c)(3) Public Charity' : 'Other Nonprofit',
      mission: null,
      annual_revenue: org.income_amount ? `$${org.income_amount.toLocaleString()}` : null,
      ntee_code: org.ntee_code || null,
      ntee_description: null,
      ruling_date: org.ruling_date || null,
      data_sources: ['ProPublica']
    }));

    return Response.json(mapped);

  } catch (error) {
    console.error('ProPublica function error:', error);
    return Response.json({ 
      error: error.message || 'Failed to fetch from ProPublica' 
    }, { status: 500 });
  }
});