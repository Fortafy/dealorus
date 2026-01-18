import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchForm from "./SearchForm";
import CSVUploader from "../upload/CSVUploader";
import ProcessingProgress from "../upload/ProcessingProgress";
import OrganizationCard from "../results/OrganizationCard";
import SearchResultsTable from "./SearchResultsTable";

export default function SearchPanel({ onSearchComplete, onClose }) {
  const [searchResult, setSearchResult] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("single");
  const [useAISearch, setUseAISearch] = useState(false);

  const handleSearch = async ({ orgName, ein, state, city, minRevenue, maxRevenue, orgType, nteeDescription }) => {
    setIsSearching(true);
    setError(null);
    setSearchResult(null);

    try {
      // Direct API search - try CharityAPI first if we have location info
      if (!useAISearch && (state || city)) {
        const results = [];
        
        // Try CharityAPI (searches by state and city)
        try {
          const charityApiResponse = await base44.functions.invoke('charityApiSearch', { 
            state: state || undefined,
            city: city || undefined
          });
          
          if (charityApiResponse.data && Array.isArray(charityApiResponse.data)) {
            results.push(...charityApiResponse.data);
          }
        } catch (err) {
          console.error('CharityAPI search failed:', err);
        }

        // Filter results based on search criteria
        let filteredResults = results;
        
        if (orgName) {
          filteredResults = filteredResults.filter(org => 
            org.organization_name?.toLowerCase().includes(orgName.toLowerCase())
          );
        }
        
        if (city) {
          filteredResults = filteredResults.filter(org => 
            org.city?.toLowerCase() === city.toLowerCase()
          );
        }
        
        if (minRevenue || maxRevenue) {
          filteredResults = filteredResults.filter(org => {
            if (!org.annual_revenue) return false;
            const revenue = parseFloat(org.annual_revenue.replace(/[$,]/g, ''));
            if (minRevenue && revenue < parseFloat(minRevenue)) return false;
            if (maxRevenue && revenue > parseFloat(maxRevenue)) return false;
            return true;
          });
        }

        // Enrich NTEE descriptions
        filteredResults.forEach(org => {
          if (org.ntee_code && !org.ntee_description) {
            org.ntee_description = getNTEEDescription(org.ntee_code);
          }
        });

        if (filteredResults.length > 0) {
          setSearchResult(filteredResults);
          setIsSearching(false);
          return;
        }
      }

      // If we have an EIN, try direct API lookups
      if (!useAISearch && ein) {
        const results = [];
        
        // Try all three APIs in parallel
        const apiCalls = [
          base44.functions.invoke('charityApiSearch', { ein }).catch(() => null),
          base44.functions.invoke('propublicaSearch', { ein }).catch(() => null),
          base44.functions.invoke('nonprofitCheckPlusSearch', { ein }).catch(() => null)
        ];
        
        const responses = await Promise.all(apiCalls);
        
        responses.forEach(response => {
          if (response?.data) {
            if (Array.isArray(response.data)) {
              results.push(...response.data);
            } else {
              results.push(response.data);
            }
          }
        });

        // Enrich NTEE descriptions
        results.forEach(org => {
          if (org.ntee_code && !org.ntee_description) {
            org.ntee_description = getNTEEDescription(org.ntee_code);
          }
        });

        if (results.length > 0) {
          setSearchResult(results);
          setIsSearching(false);
          return;
        }
      }

      // Fall back to AI search if no API results or user requested AI
      let searchCriteria = [];
      if (orgName) searchCriteria.push(`organization name "${orgName}"`);
      if (ein) searchCriteria.push(`EIN "${ein}"`);
      if (city && state) searchCriteria.push(`located in ${city}, ${state}`);
      else if (city) searchCriteria.push(`in city "${city}"`);
      else if (state) searchCriteria.push(`in state ${state}`);
      if (minRevenue && maxRevenue) searchCriteria.push(`annual revenue between $${minRevenue} and $${maxRevenue}`);
      else if (minRevenue) searchCriteria.push(`annual revenue of at least $${minRevenue}`);
      else if (maxRevenue) searchCriteria.push(`annual revenue up to $${maxRevenue}`);
      if (orgType) {
        const typeMap = {
          "501c3": "501(c)(3) Public Charity",
          "foundation": "Private Foundation",
          "government": "Government Agency",
          "other": "Other Nonprofit"
        };
        searchCriteria.push(`organization type "${typeMap[orgType]}"`);
      }
      if (nteeDescription) searchCriteria.push(`NTEE category "${nteeDescription}"`);

      const orgTypeText = orgType ? (() => {
        const typeMap = {
          "501c3": "501(c)(3) Public Charity",
          "foundation": "Private Foundation",
          "government": "Government Agency",
          "other": "Other Nonprofit"
        };
        return typeMap[orgType];
      })() : null;

      const isMultiSearch = !orgName && !ein;

      let prompt = `You are searching databases of nonprofit and government organizations.

SEARCH CRITERIA - ALL must be matched:
${searchCriteria.join("\n")}

STRICT FILTERING RULES - MUST BE FOLLOWED:
${orgTypeText ? `1. Organization type MUST BE EXACTLY "${orgTypeText}" - reject any other types\n` : ''}
${city ? `2. City MUST BE "${city}"\n` : ''}
${state ? `3. State MUST BE "${state}"\n` : ''}
${minRevenue || maxRevenue ? `4. Annual revenue MUST BE ${minRevenue ? `at least $${minRevenue}` : ''}${minRevenue && maxRevenue ? ' and ' : ''}${maxRevenue ? `no more than $${maxRevenue}` : ''}\n` : ''}
${nteeDescription ? `5. NTEE category MUST match or be related to "${nteeDescription}"\n` : ''}

For each organization found, provide complete data including organization_name, state, ein, address, city, zip_code, phone, email, website, organization_type, mission, annual_revenue, ntee_code, ntee_description, ruling_date, and data_sources array.

${isMultiSearch ? 'Return ALL organizations found (no limit).' : 'Return array with 1 organization.'}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            organizations: {
              type: "array",
              items: {
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
                  ntee_description: { type: ["string", "null"] },
                  ruling_date: { type: ["string", "null"] },
                  data_sources: { type: "array", items: { type: "string" } },
                }
              }
            }
          },
        },
      });

      const orgs = result.organizations || [];

      orgs.forEach(org => {
        if (org.ntee_code && !org.ntee_description) {
          org.ntee_description = getNTEEDescription(org.ntee_code);
        }
      });
      
      if (orgs.length > 0) {
        setSearchResult(orgs);
      } else {
        setError("No organizations found matching the criteria.");
      }
    } catch (err) {
      setError("Unable to fetch organization data. Please try again.");
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async (data) => {
    await base44.entities.SearchResult.create(data);
    onSearchComplete();
    setSelectedOrg(null);
    setSearchResult(null);
    onClose();
  };

  const handleSaveAll = async () => {
    if (Array.isArray(searchResult)) {
      for (const org of searchResult) {
        await base44.entities.SearchResult.create(org);
      }
      onSearchComplete();
      setSearchResult(null);
      setSelectedOrg(null);
      onClose();
    }
  };

  const handleBulkUpload = async (file) => {
    setIsProcessingBulk(true);
    setError(null);
    setBulkResults([]);
    setActiveTab("bulk");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              organization_name: { type: "string" },
              state: { type: "string" },
            },
            required: ["organization_name", "state"],
          },
        },
      });

      if (extractionResult.status === "error") {
        setError(extractionResult.details || "Failed to parse CSV file");
        setIsProcessingBulk(false);
        return;
      }

      const organizations = extractionResult.output || [];
      if (organizations.length === 0) {
        setError("No valid organizations found in the CSV file");
        setIsProcessingBulk(false);
        return;
      }

      setBulkTotal(organizations.length);
      const results = [];

      for (let i = 0; i < organizations.length; i++) {
        setCurrentBulkIndex(i);
        const org = organizations[i];

        if (!org.organization_name || !org.state) {
          results.push({
            ...org,
            status: "error",
            error: "Missing organization name or state",
          });
          setBulkResults([...results]);
          continue;
        }

        try {
          const prompt = `Search for nonprofit or government organization data for "${org.organization_name}" in ${org.state}.
          
Find and return accurate information from public sources like ProPublica, IRS, Charity Navigator, GuideStar, etc.

Return a JSON object with these fields (use null for any field where data is not found):
- organization_name, state, ein, address, city, zip_code, phone, email, website, organization_type, mission, annual_revenue, ntee_code, ruling_date, data_sources (array)`;

          const enrichedData = await base44.integrations.Core.InvokeLLM({
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
                data_sources: { type: "array", items: { type: "string" } },
              },
            },
          });

          if (enrichedData.ntee_code && !enrichedData.ntee_description) {
            enrichedData.ntee_description = getNTEEDescription(enrichedData.ntee_code);
          }

          await base44.entities.SearchResult.create(enrichedData);

          results.push({
            ...enrichedData,
            status: "success",
          });
        } catch (err) {
          results.push({
            organization_name: org.organization_name,
            state: org.state,
            status: "error",
            error: err.message || "Failed to enrich data",
          });
        }

        setBulkResults([...results]);
      }

      onSearchComplete();
    } catch (err) {
      setError(err.message || "Failed to process CSV file");
    } finally {
      setIsProcessingBulk(false);
      setCurrentBulkIndex(0);
    }
  };

  return (
    <div className="m-6">
      <div className="bg-white rounded-lg shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="text-white p-6" style={{ background: 'linear-gradient(to right, hsl(217, 91%, 60%), hsl(217, 91%, 55%))' }}>
          <h2 className="text-xl font-semibold">Data Enrichment</h2>
          <p className="text-sm mt-1 opacity-90">Search for organizations and enrich data</p>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="single">Single Search</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-0">
          <div className="mb-4 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={useAISearch}
                onChange={(e) => setUseAISearch(e.target.checked)}
                className="rounded border-slate-300"
              />
              Use AI-powered search (slower, broader results)
            </label>
          </div>
          <SearchForm onSearch={handleSearch} isLoading={isSearching} />

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isSearching && (
            <div className="flex flex-col items-center justify-center py-12 mt-4">
              <div className="w-12 h-12 rounded-full border-4 border-blue-100 animate-spin mb-4" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
              <p className="text-slate-600 font-medium">
                {useAISearch ? 'AI searching public databases...' : 'Searching API databases...'}
              </p>
              <p className="text-sm text-slate-400 mt-1">This may take a few seconds</p>
            </div>
          )}

          {searchResult && !isSearching && (
            <div className="mt-4">
              {selectedOrg ? (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrg(null)}
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Results
                  </Button>
                  <OrganizationCard
                    data={selectedOrg}
                    onSave={handleSave}
                    isSaved={false}
                  />
                </div>
              ) : Array.isArray(searchResult) && searchResult.length > 1 ? (
                <SearchResultsTable
                  results={searchResult}
                  onSelectOrganization={setSelectedOrg}
                  onSaveAll={handleSaveAll}
                  onSaveSelected={async (selected) => {
                    for (const org of selected) {
                      await base44.entities.SearchResult.create(org);
                    }
                    onSearchComplete();
                    setSearchResult(null);
                    setSelectedOrg(null);
                  }}
                />
              ) : (
                <OrganizationCard
                  data={Array.isArray(searchResult) ? searchResult[0] : searchResult}
                  onSave={handleSave}
                  isSaved={false}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulk" className="mt-0">
          <CSVUploader onUpload={handleBulkUpload} isProcessing={isProcessingBulk} />

          {isProcessingBulk && (
            <ProcessingProgress
              results={bulkResults}
              total={bulkTotal}
              currentIndex={currentBulkIndex}
            />
          )}

          {bulkResults.length > 0 && !isProcessingBulk && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-100 mt-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Bulk Processing Complete
                  </h3>
                  <p className="text-slate-700 mb-4">
                    Successfully processed {bulkResults.filter(r => r.status === "success").length} out of {bulkResults.length} organizations.
                  </p>
                  {bulkResults.filter(r => r.status === "error").length > 0 && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-sm text-red-800">
                        {bulkResults.filter(r => r.status === "error").length} organizations failed to process.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}