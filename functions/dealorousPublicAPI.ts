import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Simplified NTEE category lookup (inlined - no local imports allowed)
const NTEE_CATEGORIES = {
  "A": "Arts, Culture & Humanities", "B": "Education", "C": "Environment",
  "D": "Animal-Related", "E": "Health Care", "F": "Mental Health & Crisis Intervention",
  "G": "Voluntary Health Associations & Medical Disciplines", "H": "Medical Research",
  "I": "Crime & Legal-Related", "J": "Employment", "K": "Food, Agriculture & Nutrition",
  "L": "Housing & Shelter", "M": "Public Safety, Disaster Preparedness & Relief",
  "N": "Recreation & Sports", "O": "Youth Development", "P": "Human Services",
  "Q": "International, Foreign Affairs & National Security",
  "R": "Civil Rights, Social Action & Advocacy",
  "S": "Community Improvement & Capacity Building",
  "T": "Philanthropy, Voluntarism & Grantmaking Foundations",
  "U": "Science & Technology", "V": "Social Science", "W": "Public & Societal Benefit",
  "X": "Religion-Related", "Y": "Mutual & Membership Benefit", "Z": "Unknown"
};

function getNTEEDescription(code) {
  if (!code) return null;
  const letter = code.toUpperCase().charAt(0);
  return NTEE_CATEGORIES[letter] || null;
}

function formatEIN(ein) {
  if (!ein) return null;
  const clean = ein.toString().replace(/\D/g, '');
  if (clean.length === 9) return `${clean.substring(0, 2)}-${clean.substring(2)}`;
  return ein;
}

function buildOpenApiSchema(baseUrl) {
  return {
    openapi: "3.0.0",
    info: {
      title: "DealorousNonprofitAPI",
      version: "1.0.0",
      description: "Search and enrich nonprofit organization data"
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/": {
        post: {
          operationId: "searchNonprofits",
          summary: "Search for nonprofit organizations",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { "$ref": "#/components/schemas/SearchRequest" }
              }
            }
          },
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: { "$ref": "#/components/schemas/SearchResponse" }
                }
              }
            },
            "400": { description: "Bad request" },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" },
            "500": { description: "Internal server error" }
          }
        }
      }
    },
    components: {
      schemas: {
        SearchRequest: {
          type: "object",
          required: ["api_key"],
          properties: {
            api_key: { type: "string" },
            orgName: { type: "string" },
            ein: { type: "string" },
            state: { type: "string" },
            city: { type: "string" },
            orgType: { type: "string" },
            source: { type: "string" }
          }
        },
        NonprofitResult: {
          type: "object",
          properties: {
            organization_name: { type: "string" },
            state: { type: "string" },
            ein: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            zip_code: { type: "string" },
            phone: { type: "string" },
            email: { type: "string" },
            website: { type: "string" },
            organization_type: { type: "string" },
            mission: { type: "string" },
            annual_revenue: { type: "string" },
            ntee_code: { type: "string" },
            ntee_description: { type: "string" },
            ruling_date: { type: "string" },
            data_sources: { type: "array", items: { type: "string" } }
          }
        },
        SearchResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            count: { type: "integer" },
            sources_used: { type: "array", items: { type: "string" } },
            response_time_ms: { type: "integer" },
            results: {
              type: "array",
              items: { "$ref": "#/components/schemas/NonprofitResult" }
            }
          }
        }
      }
    }
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization'
      }
    });
  }

  // Serve OpenAPI schema for GET requests (Salesforce External Services schema discovery)
  if (req.method === 'GET') {
    const reqUrl = new URL(req.url);
    // Use the full URL (protocol + host + pathname) as the server base,
    // so Salesforce knows POST calls go to this exact endpoint
    const baseUrl = "https://civic-beacon-acaf302c.base44.app/api/functions";
    const schema = buildOpenApiSchema(baseUrl);
    return new Response(JSON.stringify(schema, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization'
      }
    });
  }

  const startTime = Date.now();
  const base44 = createClientFromRequest(req);

  let clientRecord = null;
  let apiKeyPrefix = null;
  let searchParams = {};

  try {
    // ── 1. Authenticate via API Key ────────────────────────────────────────────
    let apiKey = req.headers.get('X-API-Key');
    let body = {};

    if (req.method === 'POST') {
      body = await req.json();
      if (!apiKey && body.api_key) apiKey = body.api_key;
    } else {
      const url = new URL(req.url);
      if (!apiKey) apiKey = url.searchParams.get('api_key');
      for (const [k, v] of url.searchParams) body[k] = v;
    }

    if (!apiKey) {
      return Response.json({ error: 'API key required. Provide X-API-Key header or api_key parameter.' }, { status: 401 });
    }

    apiKeyPrefix = apiKey.substring(0, 8);

    const clients = await base44.asServiceRole.entities.Client.filter({ api_key: apiKey });
    if (!clients || clients.length === 0) {
      return Response.json({ error: 'Invalid API key.' }, { status: 401 });
    }
    clientRecord = clients[0];

    if (clientRecord.subscription_status === 'canceled' || clientRecord.subscription_status === 'suspended') {
      return Response.json({ error: 'Account is suspended. Please contact support.' }, { status: 403 });
    }

    // ── 2. Parse Search Parameters ────────────────────────────────────────────
    const { orgName, ein, state, city, orgType, nteeCodeId, source = 'External API' } = body;

    if (!orgName && !ein && !state) {
      return Response.json({ error: 'At least one search parameter required: orgName, ein, or state.' }, { status: 400 });
    }

    searchParams = { orgName, ein, state, city, orgType, nteeCodeId };
    const enrichmentSources = [];
    let results = [];

    // ── 3. Step 1: ProPublica ─────────────────────────────────────────────────
    if (ein) {
      const cleanEin = ein.replace(/-/g, '');
      const ppRes = await fetch(`https://projects.propublica.org/nonprofits/api/v2/organizations/${cleanEin}.json`);
      if (ppRes.ok) {
        const ppData = await ppRes.json();
        const org = ppData.organization;
        if (org) {
          enrichmentSources.push('ProPublica');
          let most_recent_990 = null;
          if (ppData.filings_with_data?.length > 0) {
            const f = ppData.filings_with_data.find(f => f.pdf_url);
            most_recent_990 = f?.pdf_url || null;
          }
          results.push({
            organization_name: org.name || null,
            state: org.state || null,
            ein: org.strein ? formatEIN(org.strein.toString()) : null,
            address: org.address || null,
            city: org.city || null,
            zip_code: org.zipcode || null,
            phone: null, email: null, website: null,
            organization_type: org.subsection_code === 3 ? '501(c)(3) Public Charity' : 'Other Nonprofit',
            mission: null,
            annual_revenue: org.revenue_amount ? `$${org.revenue_amount.toLocaleString()}` : null,
            ntee_code: org.ntee_code || null,
            ntee_description: getNTEEDescription(org.ntee_code),
            ruling_date: org.ruling_date || null,
            most_recent_990,
            data_sources: ['ProPublica']
          });
        }
      }
    } else {
      const ppParams = new URLSearchParams();
      if (state) ppParams.append('state[id]', state);
      if (orgName) ppParams.append('q', orgName);
      if (city) ppParams.append('city[id]', city);
      if (orgType && orgType !== 'Other Nonprofit') {
        const typeMap = { '501c3': '3', 'foundation': '3', '501c4': '4', '501c6': '6' };
        if (typeMap[orgType]) ppParams.append('c_code[id]', typeMap[orgType]);
      }
      if (nteeCodeId) ppParams.append('ntee[id]', nteeCodeId);

      const ppRes = await fetch(`https://projects.propublica.org/nonprofits/api/v2/search.json?${ppParams.toString()}`);
      if (ppRes.ok) {
        const ppData = await ppRes.json();
        const orgs = ppData.organizations || [];
        if (orgs.length > 0) {
          enrichmentSources.push('ProPublica');
          results = orgs.map(org => ({
            organization_name: org.name || null,
            state: org.state || null,
            ein: org.ein ? formatEIN(org.ein.toString()) : null,
            address: org.straddress || null,
            city: org.city || null,
            zip_code: org.zipcode || null,
            phone: null, email: null, website: null,
            organization_type: org.subseccd === 3 ? '501(c)(3) Public Charity' : 'Other Nonprofit',
            mission: null,
            annual_revenue: org.income_amount ? `$${org.income_amount.toLocaleString()}` : null,
            ntee_code: org.ntee_code || null,
            ntee_description: getNTEEDescription(org.ntee_code),
            ruling_date: org.ruling_date || null,
            data_sources: ['ProPublica']
          }));
        }
      }
    }

    // Filter by orgName after search
    if (orgName && results.length > 0) {
      results = results.filter(r => r.organization_name?.toLowerCase().includes(orgName.toLowerCase()));
    }

    // ── 4. Step 2: CharityAPI Enrichment ──────────────────────────────────────
    const charityApiKey = Deno.env.get('CHARITY_API_KEY');
    if (charityApiKey && results.length > 0) {
      const enriched = await Promise.all(results.map(async (org) => {
        if (!org.ein) return org;
        const cleanEin = org.ein.replace(/-/g, '');
        const res = await fetch(`https://api.charityapi.org/api/organizations/${cleanEin}`, {
          headers: { 'Authorization': `Bearer ${charityApiKey}` }
        });
        if (!res.ok) return org;
        const data = await res.json();
        const c = data.data;
        if (!c) return org;
        if (!enrichmentSources.includes('CharityAPI')) enrichmentSources.push('CharityAPI');
        return {
          ...org,
          website: org.website || null,
          annual_revenue: org.annual_revenue || (c.revenue_amt ? `$${c.revenue_amt.toLocaleString()}` : null),
          ntee_code: org.ntee_code || c.ntee_cd || null,
          ntee_description: org.ntee_description || getNTEEDescription(c.ntee_cd),
          ruling_date: org.ruling_date || (c.ruling ? `${c.ruling.toString().substring(0, 4)}-${c.ruling.toString().substring(4, 6)}-01` : null),
          data_sources: [...(org.data_sources || []), 'CharityAPI']
        };
      }));
      results = enriched;
    }

    // ── 5. Step 3: NonprofitCheckPlus Enrichment ──────────────────────────────
    const ncpApiKey = Deno.env.get('NONPROFIT_CHECK_PLUS_API_KEY');
    if (ncpApiKey && results.length > 0) {
      const enriched = await Promise.all(results.map(async (org) => {
        if (!org.ein) return org;
        const cleanEin = org.ein.replace(/-/g, '');
        const res = await fetch(`https://entities.pactman.org/api/entities/nonprofitcheck/v1/us/ein/${cleanEin}`, {
          headers: { 'Authorization': `Bearer ${ncpApiKey}` }
        });
        if (!res.ok) return org;
        const data = await res.json();
        const ncp = data.data || data;
        if (!ncp) return org;
        if (!enrichmentSources.includes('NonprofitCheckPlus')) enrichmentSources.push('NonprofitCheckPlus');
        return {
          ...org,
          phone: org.phone || ncp.phone || null,
          email: org.email || ncp.email || null,
          website: org.website || ncp.website || null,
          mission: org.mission || ncp.mission || null,
          organization_type: org.organization_type || ncp.organization_type || null,
          data_sources: [...(org.data_sources || []), 'NonprofitCheckPlus']
        };
      }));
      results = enriched;
    }

    // ── 6. Step 4: AI Fallback ────────────────────────────────────────────────
    if (results.length === 0) {
      const prompt = `Search for nonprofit organization data for "${orgName || 'any organization'}"${city ? ` in ${city}` : ''}${state ? `, ${state}` : ''}.
Find accurate information from public sources (ProPublica, IRS, Charity Navigator, GuideStar).
Return a JSON object with: organization_name, state, ein, address, city, zip_code, phone, email, website, organization_type, mission, annual_revenue, ntee_code, ruling_date, data_sources (array of strings).
Use null for missing fields.`;

      const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            organization_name: { type: "string" },
            state: { type: "string" },
            ein: { type: ["string", "null"] },
            address: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
            zip_code: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            website: { type: ["string", "null"] },
            organization_type: { type: ["string", "null"] },
            mission: { type: ["string", "null"] },
            annual_revenue: { type: ["string", "null"] },
            ntee_code: { type: ["string", "null"] },
            ruling_date: { type: ["string", "null"] },
            data_sources: { type: "array", items: { type: "string" } }
          }
        }
      });

      if (aiResult?.organization_name) {
        enrichmentSources.push('AI');
        if (aiResult.ein) aiResult.ein = formatEIN(aiResult.ein);
        if (aiResult.ntee_code) aiResult.ntee_description = getNTEEDescription(aiResult.ntee_code);
        results = [{ ...aiResult, data_sources: [...(aiResult.data_sources || []), 'AI'] }];
      }
    }

    const responseTime = Date.now() - startTime;

    // ── 7. Log the Request ────────────────────────────────────────────────────
    await base44.asServiceRole.entities.ApiRequestLog.create({
      client_id: clientRecord.id,
      api_key_prefix: apiKeyPrefix,
      request_source: source,
      search_params: searchParams,
      result_count: results.length,
      enrichment_sources: enrichmentSources,
      response_status: results.length > 0 ? 'success' : 'no_results',
      response_time_ms: responseTime
    });

    return new Response(JSON.stringify({
      success: true,
      count: results.length,
      sources_used: enrichmentSources,
      results,
      response_time_ms: responseTime
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Dealorus API error:', error);
    const responseTime = Date.now() - startTime;

    if (clientRecord) {
      await base44.asServiceRole.entities.ApiRequestLog.create({
        client_id: clientRecord.id,
        api_key_prefix: apiKeyPrefix,
        request_source: 'External API',
        search_params: searchParams,
        result_count: 0,
        enrichment_sources: [],
        response_status: 'error',
        response_time_ms: responseTime,
        error_message: error.message
      }).catch(() => {});
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});