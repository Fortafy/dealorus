import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SearchForm from "@/components/search/SearchForm";
import OrganizationCard from "@/components/results/OrganizationCard";
import SearchHistory from "@/components/results/SearchHistory";
import EmptyState from "@/components/results/EmptyState";
import CSVUploader from "@/components/upload/CSVUploader";
import ProcessingProgress from "@/components/upload/ProcessingProgress";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("single");
  const queryClient = useQueryClient();

  const { data: savedSearches = [] } = useQuery({
    queryKey: ["searchResults"],
    queryFn: () => base44.entities.SearchResult.list("-created_date", 20),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.SearchResult.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searchResults"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SearchResult.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searchResults"] });
    },
  });

  const handleSearch = async ({ orgName, state }) => {
    setIsSearching(true);
    setError(null);
    setSearchResult(null);

    const prompt = `Search for nonprofit or government organization data for "${orgName}" in ${state}.
    
Find and return accurate information from public sources like:
- ProPublica Nonprofit Explorer
- IRS Tax Exempt Organization Search
- Charity Navigator
- GuideStar/Candid
- State charity registrations
- Official government databases

Return a JSON object with these fields (use null for any field where data is not found):
- organization_name: The official registered name
- state: The state code (${state})
- ein: Employer Identification Number (format: XX-XXXXXXX)
- address: Street address
- city: City name
- zip_code: ZIP code
- phone: Phone number
- email: Contact email if publicly available
- website: Official website URL
- organization_type: Type like "501(c)(3) Public Charity", "Government Agency", etc.
- mission: Brief mission statement or description
- annual_revenue: Most recent reported annual revenue (formatted like "$1,234,567")
- ntee_code: National Taxonomy of Exempt Entities classification code
- ruling_date: Date tax-exempt status was granted (if applicable)
- data_sources: Array of source names where information was found`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
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

      setSearchResult(result);
    } catch (err) {
      setError("Unable to fetch organization data. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async (data) => {
    await saveMutation.mutateAsync(data);
  };

  const handleSelectSaved = (search) => {
    setSearchResult(search);
    setError(null);
  };

  const handleBulkUpload = async (file) => {
    setIsProcessingBulk(true);
    setError(null);
    setBulkResults([]);
    setActiveTab("bulk");

    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from CSV
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

      // Process each organization
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

          // Save to database
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

      // Refresh the saved searches list
      queryClient.invalidateQueries({ queryKey: ["searchResults"] });
    } catch (err) {
      setError(err.message || "Failed to process CSV file");
    } finally {
      setIsProcessingBulk(false);
      setCurrentBulkIndex(0);
    }
  };

  const isSaved = searchResult && savedSearches.some(
    (s) => s.ein === searchResult.ein && s.organization_name === searchResult.organization_name
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Search Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8"
            >
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="single">Single Search</TabsTrigger>
                  <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="mt-0">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">
                      Search Organization
                    </h2>
                    <p className="text-sm text-slate-500">
                      Enter details to enrich your data from public databases
                    </p>
                  </div>
                  <SearchForm onSearch={handleSearch} isLoading={isSearching} />
                </TabsContent>

                <TabsContent value="bulk" className="mt-0">
                  <CSVUploader onUpload={handleBulkUpload} isProcessing={isProcessingBulk} />
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Bulk Processing Progress */}
            {isProcessingBulk && (
              <ProcessingProgress
                results={bulkResults}
                total={bulkTotal}
                currentIndex={currentBulkIndex}
              />
            )}

            {/* Error State */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Results */}
            {searchResult && activeTab === "single" ? (
              <OrganizationCard
                data={searchResult}
                onSave={handleSave}
                isSaved={isSaved}
              />
            ) : (
              !isSearching && !isProcessingBulk && activeTab === "single" && <EmptyState />
            )}

            {/* Bulk Results Summary */}
            {bulkResults.length > 0 && !isProcessingBulk && activeTab === "bulk" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 md:p-8 border border-green-100"
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
                      All results have been saved to your search history.
                    </p>
                    {bulkResults.filter(r => r.status === "error").length > 0 && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-sm text-red-800">
                          {bulkResults.filter(r => r.status === "error").length} organizations failed to process. Check for missing or invalid data in your CSV.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Loading State */}
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Searching public databases...</p>
                <p className="text-sm text-slate-400 mt-1">This may take a few seconds</p>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <SearchHistory
                searches={savedSearches}
              />

              {/* Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 p-5 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white"
              >
                <h3 className="font-semibold mb-2">Data Sources</h3>
                <ul className="text-sm text-indigo-100 space-y-1.5">
                  <li>• ProPublica Nonprofit Explorer</li>
                  <li>• IRS Tax Exempt Database</li>
                  <li>• Charity Navigator</li>
                  <li>• GuideStar/Candid</li>
                  <li>• State Registrations</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}