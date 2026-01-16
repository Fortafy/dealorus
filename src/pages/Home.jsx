import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SearchForm from "@/components/search/SearchForm";
import OrganizationCard from "@/components/results/OrganizationCard";
import SearchHistory from "@/components/results/SearchHistory";
import EmptyState from "@/components/results/EmptyState";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Home() {
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
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
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  Search Organization
                </h2>
                <p className="text-sm text-slate-500">
                  Enter details to enrich your data from public databases
                </p>
              </div>
              <SearchForm onSearch={handleSearch} isLoading={isSearching} />
            </motion.div>

            {/* Error State */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Results */}
            {searchResult ? (
              <OrganizationCard
                data={searchResult}
                onSave={handleSave}
                isSaved={isSaved}
              />
            ) : (
              !isSearching && <EmptyState />
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
                onSelect={handleSelectSaved}
                onDelete={(id) => deleteMutation.mutate(id)}
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