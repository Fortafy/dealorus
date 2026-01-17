import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchForm from "./SearchForm";
import CSVUploader from "../upload/CSVUploader";
import ProcessingProgress from "../upload/ProcessingProgress";
import OrganizationCard from "../results/OrganizationCard";
import SearchResultsTable from "./SearchResultsTable";

export default function SearchDialog({ open, onOpenChange, onSearchComplete }) {
  const [searchResult, setSearchResult] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("single");

  const handleSearch = async ({ orgName, ein, state, city, minRevenue, maxRevenue, orgType, nteeDescription }) => {
    setIsSearching(true);
    setError(null);
    setSearchResult(null);

    try {
      // If organization name is provided, use CharityAPI
      if (orgName) {
        const response = await base44.functions.invoke('searchCharityAPI', {
          organizationName: orgName,
          state: state || undefined,
          city: city || undefined
        });

        if (response.data.error) {
          setError(response.data.error);
          setIsSearching(false);
          return;
        }

        // CharityAPI returns data in a specific format - extract organizations
        const apiOrgs = response.data.data || response.data || [];
        
        // Map CharityAPI data to our format
        const orgs = (Array.isArray(apiOrgs) ? apiOrgs : [apiOrgs]).map(org => ({
          organization_name: org.organization_name || org.name,
          state: org.state,
          ein: org.ein || null,
          address: org.address || null,
          city: org.city || null,
          zip_code: org.zip_code || org.zipcode || null,
          phone: org.phone || null,
          email: org.email || null,
          website: org.website || null,
          organization_type: org.organization_type || org.type || null,
          mission: org.mission || null,
          annual_revenue: org.annual_revenue || org.revenue || null,
          ntee_code: org.ntee_code || null,
          ntee_description: org.ntee_description || (org.ntee_code ? getNTEEDescription(org.ntee_code) : null),
          ruling_date: org.ruling_date || null,
          data_sources: ["CharityAPI"]
        }));

        // Apply additional client-side filters
        let filteredOrgs = orgs;

        if (ein) {
          filteredOrgs = filteredOrgs.filter(org => org.ein && org.ein.includes(ein));
        }
        if (orgType) {
          const typeMap = {
            "501c3": "501(c)(3)",
            "foundation": "Foundation",
            "government": "Government",
            "other": "Other"
          };
          filteredOrgs = filteredOrgs.filter(org => 
            org.organization_type && org.organization_type.toLowerCase().includes(typeMap[orgType].toLowerCase())
          );
        }
        if (nteeDescription) {
          filteredOrgs = filteredOrgs.filter(org =>
            (org.ntee_description && org.ntee_description.toLowerCase().includes(nteeDescription.toLowerCase())) ||
            (org.ntee_code && org.ntee_code.toLowerCase().includes(nteeDescription.toLowerCase()))
          );
        }
        if (minRevenue || maxRevenue) {
          filteredOrgs = filteredOrgs.filter(org => {
            if (!org.annual_revenue) return false;
            const revenue = parseInt(org.annual_revenue.replace(/[^0-9]/g, ''));
            if (minRevenue && revenue < parseInt(minRevenue)) return false;
            if (maxRevenue && revenue > parseInt(maxRevenue)) return false;
            return true;
          });
        }

        if (filteredOrgs.length > 0) {
          setSearchResult(filteredOrgs);
        } else {
          setError("No organizations found matching the criteria.");
        }
      } else {
        setError("Organization name is required for search.");
      }
    } catch (err) {
      setError("Unable to fetch organization data. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async (data) => {
    await base44.entities.SearchResult.create(data);
    onSearchComplete();
    setSelectedOrg(null);
    setSearchResult(null);
    onOpenChange(false);
  };

  const handleSaveAll = async () => {
    if (Array.isArray(searchResult)) {
      for (const org of searchResult) {
        await base44.entities.SearchResult.create(org);
      }
      onSearchComplete();
      setSearchResult(null);
      setSelectedOrg(null);
      onOpenChange(false);
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

          // Auto-map NTEE code to description
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Data Enrichment</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="single">Single Search</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-0">
            <SearchForm onSearch={handleSearch} isLoading={isSearching} />

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isSearching && (
              <div className="flex flex-col items-center justify-center py-12 mt-4">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Searching public databases...</p>
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
      </DialogContent>
    </Dialog>
  );
}