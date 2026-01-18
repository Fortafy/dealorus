import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ein, state, city, orgName, orgType, nteeCodeId } = await req.json();
    
    console.log('ProPublica function received:', { ein, state, city, orgName, orgType, nteeCodeId });

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

    // Use ProPublica search endpoint for searches
    const searchParams = new URLSearchParams();
    
    if (state) {
      // ProPublica uses state code (e.g., 'CA', 'NY') as the state[id] parameter
      searchParams.append('state[id]', state);
    }
    
    if (orgName) {
      searchParams.append('q', orgName);
    }
    
    if (city) {
      searchParams.append('city[id]', city);
    }
    
    // Map organization type to c_code[id]
    if (orgType && orgType !== 'Other Nonprofit') {
      const orgTypeMap = {
        '501c3': '3',
        'foundation': '3', // Private foundations are also 501(c)(3)
        '501c4': '4',
        '501c6': '6'
      };
      if (orgTypeMap[orgType]) {
        searchParams.append('c_code[id]', orgTypeMap[orgType]);
      }
    }
    // If 'Other Nonprofit' is selected, don't filter by c_code - search all types
    
    // Add NTEE code ID if provided
    if (nteeCodeId) {
      searchParams.append('ntee[id]', nteeCodeId);
    }

    // Only search if we have at least one search parameter
    if (!orgName && !state && !city && !ein && !orgType && !nteeCodeId) {
      return Response.json({ error: 'At least one search parameter is required' }, { status: 400 });
    }

    console.log('ProPublica search URL:', `https://projects.propublica.org/nonprofits/api/v2/search.json?${searchParams.toString()}`);

    const response = await fetch(`https://projects.propublica.org/nonprofits/api/v2/search.json?${searchParams.toString()}`);

    if (!response.ok) {
      console.error('ProPublica API error:', response.status, response.statusText);
      // Return empty array instead of error for 404s (no results found)
      if (response.status === 404) {
        return Response.json([]);
      }
      return Response.json({ 
        error: 'Failed to search ProPublica',
        status: response.status 
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('ProPublica search result:', result);
    console.log('Total results:', result.total_results, 'Pages:', result.num_pages);

    let allOrganizations = result.organizations || [];
    
    // Fetch all pages if there are multiple pages (limit to reasonable amount)
    const maxPages = Math.min(result.num_pages || 1, 20); // Limit to 20 pages (500 results) to avoid timeout
    
    if (maxPages > 1) {
      const pagePromises = [];
      for (let page = 1; page < maxPages; page++) {
        const pageParams = new URLSearchParams(searchParams);
        pageParams.append('page', page.toString());
        pagePromises.push(
          fetch(`https://projects.propublica.org/nonprofits/api/v2/search.json?${pageParams.toString()}`)
            .then(r => r.json())
            .then(data => data.organizations || [])
        );
      }
      
      const pageResults = await Promise.all(pagePromises);
      allOrganizations = allOrganizations.concat(...pageResults);
      console.log('Fetched', allOrganizations.length, 'organizations from', maxPages, 'pages');
    }

    const mapped = allOrganizations.map(org => ({
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