import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import { Sparkles, CheckCircle2, XCircle, Clock, Info } from "lucide-react";

export default function SmartEnrichDialog({ open, onOpenChange, organization, onComplete }) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [clientSettings, setClientSettings] = useState(null);

  // Fetch client settings on mount
  React.useEffect(() => {
    const fetchClientSettings = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.client_id) {
          const clients = await base44.entities.Client.filter({ id: user.client_id });
          if (clients && clients.length > 0) {
            setClientSettings(clients[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch client settings:", err);
      }
    };
    if (open) {
      fetchClientSettings();
    }
  }, [open]);

  // Use client's default data source priority, fallback to default
  const priority = clientSettings?.default_data_source_priority || ["CharityAPI", "ProPublica", "NonprofitCheckPlus", "AI"];

  const handleEnrich = async () => {
    setIsEnriching(true);
    setError(null);
    setResults(null);

    try {
      const enrichmentResults = {
        sources_checked: [],
        fields_found: {},
        merged_data: { ...organization },
        metadata: {},
      };

      // Check each source in priority order
      for (const source of priority) {
        const sourceResult = {
          source,
          checked_at: new Date().toISOString(),
          success: false,
          fields_updated: [],
          error: null,
        };

        try {
          let sourceData = null;

          // Skip sources that require EIN if we don't have one
          if (!organization.ein && ["CharityAPI", "NonprofitCheckPlus"].includes(source)) {
            sourceResult.error = "EIN required";
            enrichmentResults.sources_checked.push(sourceResult);
            continue;
          }

          // Call the appropriate source
          if (source === "CharityAPI") {
            const response = await base44.functions.invoke('charityApiSearch', { ein: organization.ein });
            sourceData = response.data;
          } else if (source === "ProPublica") {
            const searchParams = organization.ein 
              ? { ein: organization.ein }
              : { orgName: organization.organization_name, state: organization.state };
            const response = await base44.functions.invoke('propublicaSearch', searchParams);
            sourceData = response.data;
          } else if (source === "NonprofitCheckPlus") {
            const response = await base44.functions.invoke('nonprofitCheckPlusSearch', { ein: organization.ein });
            sourceData = response.data;
          } else if (source === "AI") {
            const prompt = `Find and verify data for: ${organization.organization_name} in ${organization.state}. EIN: ${organization.ein || 'unknown'}. Return accurate nonprofit data.`;
            sourceData = await base44.integrations.Core.InvokeLLM({
              prompt,
              add_context_from_internet: true,
              response_json_schema: {
                type: "object",
                properties: {
                  ein: { type: ["string", "null"] },
                  address: { type: ["string", "null"] },
                  city: { type: ["string", "null"] },
                  zip_code: { type: ["string", "null"] },
                  phone: { type: ["string", "null"] },
                  email: { type: ["string", "null"] },
                  website: { type: ["string", "null"] },
                  mission: { type: ["string", "null"] },
                  annual_revenue: { type: ["string", "null"] },
                  ntee_code: { type: ["string", "null"] },
                },
              },
            });
          }

          if (sourceData) {
            sourceResult.success = true;

            // Merge data, only filling in missing fields
            Object.keys(sourceData).forEach(field => {
              if (sourceData[field] && 
                  sourceData[field] !== "N/A" && 
                  sourceData[field] !== "Not found" &&
                  !enrichmentResults.merged_data[field]) {
                enrichmentResults.merged_data[field] = sourceData[field];
                enrichmentResults.fields_found[field] = source;
                sourceResult.fields_updated.push(field);
              }
            });

            // Auto-populate NTEE description
            if (enrichmentResults.merged_data.ntee_code && !enrichmentResults.merged_data.ntee_description) {
              enrichmentResults.merged_data.ntee_description = getNTEEDescription(enrichmentResults.merged_data.ntee_code);
              if (enrichmentResults.merged_data.ntee_description) {
                sourceResult.fields_updated.push("ntee_description");
                enrichmentResults.fields_found.ntee_description = "Auto-mapped";
              }
            }
          }
        } catch (err) {
          sourceResult.error = err.message;
        }

        enrichmentResults.sources_checked.push(sourceResult);
        enrichmentResults.metadata[source] = {
          last_checked: sourceResult.checked_at,
          fields_updated: sourceResult.fields_updated,
        };
      }

      // Update the organization record
      const updatedData = {
        ...enrichmentResults.merged_data,
        source_metadata: {
          ...(organization.source_metadata || {}),
          ...enrichmentResults.metadata,
        },
      };

      await base44.entities.Organization.update(organization.id, updatedData);
      
      setResults(enrichmentResults);
      
      if (onComplete) {
        onComplete(updatedData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: 'hsl(217, 91%, 60%)' }} />
            Smart Enrichment
          </DialogTitle>
          <DialogDescription>
            Automatically enrich data by checking multiple sources in priority order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Sources will be checked in this order: <strong>{priority.join(" → ")}</strong>
              <br />
              Only missing fields will be filled. Existing data is preserved.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Enrichment Results</h3>
              
              {results.sources_checked.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-medium text-sm">{result.source}</span>
                    </div>
                    <Badge variant={result.success ? "default" : "outline"} className="text-xs">
                      {result.fields_updated.length} fields
                    </Badge>
                  </div>
                  
                  {result.error && (
                    <p className="text-xs text-slate-500 mt-1">{result.error}</p>
                  )}
                  
                  {result.fields_updated.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.fields_updated.map((field, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-white">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">
                    {Object.keys(results.fields_found).length} fields updated
                  </span>
                </div>
                <p className="text-xs text-blue-800">
                  Organization record has been updated with the latest data.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isEnriching}>
                Cancel
              </Button>
              <Button 
                onClick={handleEnrich} 
                disabled={isEnriching}
                style={{ backgroundColor: 'hsl(217, 91%, 60%)' }}
              >
                {isEnriching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Enrichment
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}