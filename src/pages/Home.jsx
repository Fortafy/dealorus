import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SearchForm from "@/components/search/SearchForm";
import OrganizationCard from "@/components/results/OrganizationCard";
import SearchResultsTable from "@/components/search/SearchResultsTable";
import EmptyState from "@/components/results/EmptyState";
import CSVUploader from "@/components/upload/CSVUploader";
import ProcessingProgress from "@/components/upload/ProcessingProgress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, ArrowLeft } from "lucide-react";

export default function Home() {
  const [searchResult, setSearchResult] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("single");
  const queryClient = useQueryClient();

  const saveSearchMutation = useMutation({
    mutationFn: (data) => base44.entities.SearchResult.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  const handleSearch = async ({ orgName, ein, state, city, minRevenue, maxRevenue, orgType }) => {
    setIsSearching(true);
    setError(null);
    setSearchResult(null);
    setSelectedOrg(null);

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

${isMultiSearch ? `
IMPORTANT: You MUST find and return 15-25 different organizations that match ALL criteria above.
Search ProPublica Nonprofit Explorer, IRS databases, Charity Navigator, GuideStar, and CharityAPI.org to find multiple matching organizations.
Use the CharityAPI.org API with the provided API key for comprehensive nonprofit data.
` : `Find the specific organization that matches the criteria.`}

For each organization, provide:
- organization_name, state, ein, address, city, zip_code, phone, email, website
- organization_type: EXACTLY as classified (must match filter if specified)
- mission, annual_revenue (as "$X,XXX,XXX"), ntee_code, ruling_date, data_sources

${isMultiSearch ? 'Return an array of 15-25 organizations.' : 'Return array with 1 organization.'}`;

    try {
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
                  ruling_date: { type: ["string", "null"] },
                  data_sources: { type: "array", items: { type: "string" } },
                }
              }
            }
          },
        },
      });

      const orgs = result.organizations || [];
      if (orgs.length > 0) {
        setSearchResult(orgs);
      } else {
        setError("No organizations found matching the criteria.");
      }
    } catch (err) {
      setError("Unable to fetch organization data. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async (data) => {
    await saveSearchMutation.mutateAsync(data);
    setSearchResult(null);
    setSelectedOrg(null);
  };

  const handleSaveAll = async () => {
    if (Array.isArray(searchResult)) {
      for (const org of searchResult) {
        await saveSearchMutation.mutateAsync(org);
      }
      setSearchResult(null);
      setSelectedOrg(null);
    }
  };

  const handleSaveSelected = async (selected) => {
    for (const org of selected) {
      await saveSearchMutation.mutateAsync(org);
    }
    setSearchResult(null);
    setSelectedOrg(null);
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

      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    } catch (err) {
      setError(err.message || "Failed to process CSV file");
    } finally {
      setIsProcessingBulk(false);
      setCurrentBulkIndex(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Data Enrichment</h1>
              <p className="text-sm text-slate-500">Nonprofit & Government Organizations</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="single">Single Search</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="mt-0">
                <SearchForm onSearch={handleSearch} isLoading={isSearching} />
              </TabsContent>

              <TabsContent value="bulk" className="mt-0">
                <CSVUploader onUpload={handleBulkUpload} isProcessing={isProcessingBulk} />
              </TabsContent>
            </Tabs>
          </motion.div>

          {isProcessingBulk && (
            <ProcessingProgress
              results={bulkResults}
              total={bulkTotal}
              currentIndex={currentBulkIndex}
            />
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!searchResult && !isSearching && activeTab === "single" && <EmptyState />}

          {isSearching && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4" />
              <p className="text-slate-600 font-medium text-lg">Searching public databases...</p>
              <p className="text-sm text-slate-400 mt-2">This may take 10-15 seconds</p>
            </div>
          )}

          {searchResult && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
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
                  onSaveSelected={handleSaveSelected}
                />
              ) : (
                <OrganizationCard
                  data={Array.isArray(searchResult) ? searchResult[0] : searchResult}
                  onSave={handleSave}
                  isSaved={false}
                />
              )}
            </motion.div>
          )}

          {bulkResults.length > 0 && !isProcessingBulk && activeTab === "bulk" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-100"
            >
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
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}