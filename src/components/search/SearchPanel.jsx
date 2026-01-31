import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import { formatEIN } from "@/components/utils/einFormatter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchForm from "./SearchForm";
import CSVUploader from "../upload/CSVUploader";
import ProcessingProgress from "../upload/ProcessingProgress";
import OrganizationCard from "../results/OrganizationCard";
import SearchResultsTable from "./SearchResultsTable";

export default function SearchPanel({ onSearchComplete, onClose, onSelectOrganization }) {
  const [searchResult, setSearchResult] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("single");
  const [lastSearchParams, setLastSearchParams] = useState(null);
  const [isLLMSearching, setIsLLMSearching] = useState(false);
  const [currentOrganizationId, setCurrentOrganizationId] = useState(null);
  const [stopBulkProcessing, setStopBulkProcessing] = useState(false);
  const [importLog, setImportLog] = useState([]);

  React.useEffect(() => {
    const getUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.client_id) {
          setCurrentOrganizationId(user.client_id);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    getUser();
  }, []);

  const handleSearch = async ({ orgName, ein, state, city, minRevenue, maxRevenue, orgType, nteeCodeId }) => {
    setIsSearching(true);
    setError(null);
    setSearchResult(null);

    // Store search params for LLM search option
    const fullParams = { orgName, ein, state, city, minRevenue, maxRevenue, orgType, nteeCodeId };
    setLastSearchParams(fullParams);

    try {
      // Search ProPublica database
      const searchParams = {};
      if (state) searchParams.state = state;
      if (city) searchParams.city = city;
      if (ein) searchParams.ein = ein;
      if (orgName) searchParams.orgName = orgName;
      if (orgType) searchParams.orgType = orgType;
      if (nteeCodeId) searchParams.nteeCodeId = nteeCodeId;
      
      console.log('ProPublica search params:', searchParams);
      
      const response = await base44.functions.invoke('propublicaSearch', searchParams);
      
      console.log('ProPublica response:', response);
      console.log('ProPublica response.data:', response?.data);
      
      let results = [];
      if (response?.data) {
        results = Array.isArray(response.data) ? response.data : [response.data];
      }

      console.log('Results after parsing:', results);

      // Filter results based on search criteria
      if (orgName) {
        results = results.filter(org => 
          org.organization_name?.toLowerCase().includes(orgName.toLowerCase())
        );
        console.log('Results after orgName filter:', results);
      }
      
      if (minRevenue || maxRevenue) {
        results = results.filter(org => {
          if (!org.annual_revenue) return false;
          const revenue = parseFloat(org.annual_revenue.replace(/[$,]/g, ''));
          if (minRevenue && revenue < parseFloat(minRevenue)) return false;
          if (maxRevenue && revenue > parseFloat(maxRevenue)) return false;
          return true;
        });
        console.log('Results after revenue filter:', results);
      }

      // Enrich NTEE descriptions and format EINs
      results.forEach(org => {
        if (org.ntee_code && !org.ntee_description) {
          org.ntee_description = getNTEEDescription(org.ntee_code);
        }
        if (org.ein) {
          org.ein = formatEIN(org.ein);
        }
      });

      if (results.length > 0) {
        setSearchResult(results);
      } else {
        setSearchResult([]); // Empty array to trigger no results UI
      }
    } catch (err) {
      console.error('ProPublica search error - Full error:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      console.error('Error response:', err.response);
      setError(`Unable to fetch organization data from ProPublica: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLLMSearch = async () => {
    if (!lastSearchParams) return;
    
    setIsLLMSearching(true);
    setError(null);
    
    try {
      const { orgName, state, city, orgType } = lastSearchParams;
      const prompt = `Search for nonprofit or government organization data for "${orgName || 'any organization'}"${city ? ` in ${city}` : ''}${state ? `, ${state}` : ''}.
          
Find and return accurate information from public sources like ProPublica, IRS, Charity Navigator, GuideStar, etc.

Return a JSON object with these fields (use null for any field where data is not found):
- organization_name, state, ein, address, city, zip_code, phone, email, website, organization_type, mission, annual_revenue, ntee_code, ruling_date, data_sources (array)`;

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

      if (result.organization_name) {
        if (result.ntee_code && !result.ntee_description) {
          result.ntee_description = getNTEEDescription(result.ntee_code);
        }
        if (result.ein) {
          result.ein = formatEIN(result.ein);
        }
        setSearchResult([result]);
      } else {
        setError("LLM search could not find the organization. Please try creating it manually.");
      }
    } catch (err) {
      console.error('LLM search error:', err);
      setError(`LLM search failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLLMSearching(false);
    }
  };

  const handleSave = async (data) => {
    const user = await base44.auth.me();
    await base44.entities.Organization.create({
      ...data,
      client_id: currentOrganizationId,
      user_id: user.id
    });
    onSearchComplete();
    setSelectedOrg(null);
    setSearchResult(null);
    onClose();
  };

  const handleUpdate = async (id, data) => {
    await base44.entities.Organization.update(id, data);
    onSearchComplete();
    setSelectedOrg(null);
    setSearchResult(null);
    onClose();
  };

  const handleSaveAll = async () => {
    if (Array.isArray(searchResult)) {
      const user = await base44.auth.me();
      for (const org of searchResult) {
        await base44.entities.Organization.create({
          ...org,
          client_id: currentOrganizationId,
          user_id: user.id
        });
      }
      onSearchComplete();
      setSearchResult(null);
      setSelectedOrg(null);
      onClose();
    }
  };

  const checkForDuplicate = async (orgData) => {
    const existingOrgs = await base44.entities.Organization.filter({ 
      client_id: currentOrganizationId 
    });

    // Check for duplicate using same logic as findDuplicates.js:
    // (1) EIN match OR (2) Name + State + City all match
    for (const existing of existingOrgs) {
      const nameMatch = existing.organization_name?.toLowerCase().trim() === orgData.organization_name?.toLowerCase().trim();
      const einMatch = orgData.ein && existing.ein && existing.ein.replace(/\D/g, '') === orgData.ein.replace(/\D/g, '');
      const stateMatch = existing.state?.toLowerCase() === orgData.state?.toLowerCase();
      const cityMatch = existing.city?.toLowerCase().trim() === orgData.city?.toLowerCase().trim();
      
      // Consider it a duplicate if EIN matches OR (Name + State + City all match)
      if (einMatch) {
        return { isDuplicate: true, reason: 'EIN match' };
      }
      
      if (nameMatch && stateMatch && cityMatch && orgData.city) {
        return { isDuplicate: true, reason: 'Name + State + City match' };
      }
    }
    
    return { isDuplicate: false };
  };

  const handleBulkUpload = async (file) => {
    setIsProcessingBulk(true);
    setError(null);
    setBulkResults([]);
    setImportLog([]);
    setStopBulkProcessing(false);
    setActiveTab("bulk");

    const log = [];

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      console.log('Upload result:', uploadResult);
      
      if (!uploadResult || !uploadResult.file_url) {
        setError("Failed to upload file");
        setIsProcessingBulk(false);
        return;
      }

      const parseResponse = await base44.functions.invoke('parseCSV', {
        file_url: uploadResult.file_url
      });

      console.log('Parse response:', parseResponse);

      if (parseResponse.data.status === "error" || parseResponse.data.error) {
        setError(parseResponse.data.error || "Failed to parse CSV file");
        setIsProcessingBulk(false);
        return;
      }

      const organizations = parseResponse.data.organizations || [];
      if (organizations.length === 0) {
        setError("No valid organizations found in the CSV file");
        setIsProcessingBulk(false);
        return;
      }

      setBulkTotal(organizations.length);
      const results = [];

      for (let i = 0; i < organizations.length; i++) {
        if (stopBulkProcessing) {
          log.push({
            row: i + 1,
            organization_name: organizations[i].organization_name,
            status: 'stopped',
            message: 'Processing stopped by user'
          });
          break;
        }

        setCurrentBulkIndex(i);
        const org = organizations[i];

        if (!org.organization_name || !org.state) {
          const logEntry = {
            row: i + 1,
            organization_name: org.organization_name || 'Unknown',
            status: 'error',
            message: 'Missing organization name or state'
          };
          log.push(logEntry);
          results.push({
            ...org,
            status: "error",
            error: "Missing organization name or state",
          });
          setBulkResults([...results]);
          setImportLog([...log]);
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

          if (enrichedData.ein) {
            enrichedData.ein = formatEIN(enrichedData.ein);
          }

          // Check for duplicates
          const duplicateCheck = await checkForDuplicate(enrichedData);
          
          if (duplicateCheck.isDuplicate) {
            const logEntry = {
              row: i + 1,
              organization_name: enrichedData.organization_name,
              ein: enrichedData.ein,
              status: 'skipped',
              message: `Duplicate found: ${duplicateCheck.reason}`
            };
            log.push(logEntry);
            results.push({
              ...enrichedData,
              status: "skipped",
              error: `Duplicate: ${duplicateCheck.reason}`,
            });
            setBulkResults([...results]);
            setImportLog([...log]);
            continue;
          }

          const user = await base44.auth.me();
          await base44.entities.Organization.create({
            ...enrichedData,
            client_id: currentOrganizationId,
            user_id: user.id
          });

          const logEntry = {
            row: i + 1,
            organization_name: enrichedData.organization_name,
            ein: enrichedData.ein,
            status: 'success',
            message: 'Successfully imported'
          };
          log.push(logEntry);
          results.push({
            ...enrichedData,
            status: "success",
          });
        } catch (err) {
          const logEntry = {
            row: i + 1,
            organization_name: org.organization_name,
            status: 'error',
            message: err.message || 'Failed to enrich data'
          };
          log.push(logEntry);
          results.push({
            organization_name: org.organization_name,
            state: org.state,
            status: "error",
            error: err.message || "Failed to enrich data",
          });
        }

        setBulkResults([...results]);
        setImportLog([...log]);
      }

      onSearchComplete();
    } catch (err) {
      setError(err.message || "Failed to process CSV file");
      log.push({
        row: 'N/A',
        organization_name: 'N/A',
        status: 'error',
        message: err.message || 'Failed to process CSV file'
      });
      setImportLog([...log]);
    } finally {
      setIsProcessingBulk(false);
      setCurrentBulkIndex(0);
      setStopBulkProcessing(false);
    }
  };

  const downloadImportLog = () => {
    const csvContent = [
      ['Row', 'Organization Name', 'EIN', 'Status', 'Message'].join(','),
      ...importLog.map(entry => 
        [
          entry.row,
          `"${entry.organization_name || ''}"`,
          `"${entry.ein || ''}"`,
          entry.status,
          `"${entry.message || ''}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="m-6">
      <div className="bg-white rounded-lg shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="text-white p-6" style={{ background: 'linear-gradient(to right, hsl(217, 91%, 60%), hsl(217, 91%, 55%))' }}>
          <h2 className="text-xl font-semibold">Public Data Source</h2>
          <p className="text-sm mt-1 opacity-90">Search public data sources for organizations</p>
        </div>

        <div className="p-6">
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
              <div className="w-12 h-12 rounded-full border-4 border-blue-100 animate-spin mb-4" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
              <p className="text-slate-600 font-medium">Searching ProPublica database...</p>
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
                    onUpdate={handleUpdate}
                    isSaved={false}
                  />
                </div>
              ) : Array.isArray(searchResult) && searchResult.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                  <p className="text-slate-700 mb-6">No organizations found in ProPublica. Try searching via AI or create manually.</p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={handleLLMSearch}
                      disabled={isLLMSearching}
                      style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: 'white' }}
                      className="hover:opacity-90"
                    >
                      {isLLMSearching ? "Searching..." : "Search via AI"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchResult(null);
                        setLastSearchParams(null);
                      }}
                    >
                      Create Manually
                    </Button>
                  </div>
                </div>
              ) : Array.isArray(searchResult) && searchResult.length > 1 ? (
                <SearchResultsTable
                  results={searchResult}
                  onSelectOrganization={(org) => {
                    setSelectedOrg(org);
                    if (onSelectOrganization) onSelectOrganization(org);
                  }}
                  onSaveAll={handleSaveAll}
                  onSaveSelected={async (selected) => {
                    const user = await base44.auth.me();
                    for (const org of selected) {
                      await base44.entities.Organization.create({
                        ...org,
                        client_id: currentOrganizationId,
                        user_id: user.id
                      });
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
                  onUpdate={handleUpdate}
                  isSaved={false}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulk" className="mt-0">
          <CSVUploader onUpload={handleBulkUpload} isProcessing={isProcessingBulk} />

          {isProcessingBulk && (
            <div>
              <ProcessingProgress
                results={bulkResults}
                total={bulkTotal}
                currentIndex={currentBulkIndex}
              />
              <div className="mt-4 flex justify-center">
                <Button
                  variant="destructive"
                  onClick={() => setStopBulkProcessing(true)}
                  disabled={stopBulkProcessing}
                >
                  {stopBulkProcessing ? 'Stopping...' : 'Stop Import'}
                </Button>
              </div>
            </div>
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
                    Successfully imported: {bulkResults.filter(r => r.status === "success").length} | 
                    Skipped (duplicates): {bulkResults.filter(r => r.status === "skipped").length} | 
                    Failed: {bulkResults.filter(r => r.status === "error").length} | 
                    Total: {bulkResults.length}
                  </p>
                  {bulkResults.filter(r => r.status === "error").length > 0 && (
                    <Alert className="bg-red-50 border-red-200 mb-4">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-sm text-red-800">
                        {bulkResults.filter(r => r.status === "error").length} organizations failed to process.
                      </AlertDescription>
                    </Alert>
                  )}
                  {bulkResults.filter(r => r.status === "skipped").length > 0 && (
                    <Alert className="bg-amber-50 border-amber-200 mb-4">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-sm text-amber-800">
                        {bulkResults.filter(r => r.status === "skipped").length} organizations were skipped as duplicates.
                      </AlertDescription>
                    </Alert>
                  )}
                  {importLog.length > 0 && (
                    <Button
                      onClick={downloadImportLog}
                      variant="outline"
                      className="mt-2"
                    >
                      Download Import Log
                    </Button>
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