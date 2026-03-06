Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const schema = {
    openapi: "3.0.0",
    info: {
      title: "DealorousNonprofitAPI",
      version: "1.0.0",
      description: "Search and enrich nonprofit organization data"
    },
    servers: [{ url: "https://civic-beacon-acaf302c.base44.app" }],
    paths: {
      "/dealorousPublicAPI": {

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

  return new Response(JSON.stringify(schema, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
});