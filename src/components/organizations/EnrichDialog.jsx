import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import useClientMonthlyUsage from "@/hooks/useClientMonthlyUsage";
import UsageLimitNotice from "@/components/billing/UsageLimitNotice";
import { Sparkles, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const ALL_SOURCES = ["ProPublica", "CharityAPI", "NonprofitCheckPlus", "AI"];

const SOURCE_LABELS = {
  ProPublica: "ProPublica",
  CharityAPI: "CharityAPI",
  NonprofitCheckPlus: "Nonprofit Check Plus",
  AI: "AI (Web Search)",
};

export default function EnrichDialog({ open, onOpenChange, organization, onComplete }) {
  const [selectedSources, setSelectedSources] = useState(ALL_SOURCES);
  const [isEnriching, setIsEnriching] = useState(false);
  const [results, setResults] = useState(null);
  const [currentSource, setCurrentSource] = useState(null);
  const queryClient = useQueryClient();
  const { data: usage, isLoading: isLoadingUsage } = useClientMonthlyUsage(open);

  const requiredCredits = selectedSources.filter((source) =>
    organization.ein || !["CharityAPI", "NonprofitCheckPlus"].includes(source)
  ).length;
  const isUsageBlocked = !!usage && usage.remaining < requiredCredits;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSources(ALL_SOURCES);
      setResults(null);
      setCurrentSource(null);
    }
  }, [open]);

  const toggleSource = (source) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const fetchFromSource = async (source) => {
    if (source === "CharityAPI") {
      const response = await base44.functions.invoke("charityApiSearch", { ein: organization.ein });
      return response.data;
    } else if (source === "ProPublica") {
      const params = organization.ein
        ? { ein: organization.ein }
        : { orgName: organization.organization_name, state: organization.state };
      const response = await base44.functions.invoke("propublicaSearch", params);
      return response.data;
    } else if (source === "NonprofitCheckPlus") {
      const response = await base44.functions.invoke("nonprofitCheckPlusSearch", { ein: organization.ein });
      return response.data;
    } else if (source === "AI") {
      return await base44.integrations.Core.InvokeLLM({
        prompt: `Find and verify data for the nonprofit organization: "${organization.organization_name}" in ${organization.state}. EIN: ${organization.ein || "unknown"}.
Search the web and return all available data. Find the organization's logo image URL — check their official website for a direct link to their logo (PNG, JPG, SVG). Return the direct image URL.`,
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
            logo_url: { type: ["string", "null"] },
          },
        },
      });
    }
    return null;
  };

  const handleEnrich = async () => {
    if (selectedSources.length === 0 || isUsageBlocked) return;
    setIsEnriching(true);
    setResults(null);

    const enrichmentResults = {
      sources_checked: [],
      fields_found: {},
      merged_data: { ...organization },
      metadata: {},
    };

    for (const source of selectedSources) {
      setCurrentSource(source);
      const sourceResult = {
        source,
        checked_at: new Date().toISOString(),
        success: false,
        fields_updated: [],
        error: null,
      };

      try {
        // Sources requiring EIN
        if (!organization.ein && ["CharityAPI", "NonprofitCheckPlus"].includes(source)) {
          sourceResult.error = "EIN required — skipped";
          enrichmentResults.sources_checked.push(sourceResult);
          continue;
        }

        const sourceData = await fetchFromSource(source);

        if (sourceData) {
          sourceResult.success = true;
          Object.keys(sourceData).forEach((field) => {
            const val = sourceData[field];
            if (val && val !== "N/A" && val !== "Not found") {
              // Always overwrite with latest data; logo_url also always updated
              if (!enrichmentResults.merged_data[field] || field === "logo_url" || selectedSources.length === 1) {
                enrichmentResults.merged_data[field] = val;
                enrichmentResults.fields_found[field] = source;
                sourceResult.fields_updated.push(field);
              } else if (!enrichmentResults.merged_data[field]) {
                enrichmentResults.merged_data[field] = val;
                enrichmentResults.fields_found[field] = source;
                sourceResult.fields_updated.push(field);
              }
            }
          });

          // Auto-populate NTEE description
          if (enrichmentResults.merged_data.ntee_code && !enrichmentResults.merged_data.ntee_description) {
            const desc = getNTEEDescription(enrichmentResults.merged_data.ntee_code);
            if (desc) {
              enrichmentResults.merged_data.ntee_description = desc;
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

    setCurrentSource(null);

    // Save updated org
    const updatedData = {
      ...enrichmentResults.merged_data,
      source_metadata: {
        ...(organization.source_metadata || {}),
        ...enrichmentResults.metadata,
      },
    };

    await base44.entities.Organization.update(organization.id, updatedData);

    // Create Activity record
    const successSources = enrichmentResults.sources_checked.filter((s) => s.success).map((s) => s.source);
    const totalFields = Object.keys(enrichmentResults.fields_found).length;
    try {
      const user = await base44.auth.me();
      await base44.entities.Activity.create({
        organization_id: organization.id,
        contact_id: organization.id, // required field — using org id as placeholder
        action: "enrich",
        description: `Enriched from ${successSources.join(", ") || "no sources"} — ${totalFields} field${totalFields !== 1 ? "s" : ""} updated`,
        fields_changed: Object.entries(enrichmentResults.fields_found).map(([field, source]) => ({
          field,
          old_value: String(organization[field] ?? ""),
          new_value: String(enrichmentResults.merged_data[field] ?? ""),
        })),
        ...(user?.client_id ? { client_id: user.client_id } : {}),
      });
    } catch (_) {
      // Activity creation is non-blocking
    }

    const usageLogs = enrichmentResults.sources_checked
      .filter((result) => result.error !== "EIN required — skipped")
      .map((result) => ({
        client_id: organization.client_id,
        request_source: "Organization Enrich",
        search_params: {
          organization_id: organization.id,
          source: result.source,
        },
        result_count: result.fields_updated.length,
        enrichment_sources: [result.source],
        response_status: result.success
          ? (result.fields_updated.length > 0 ? "success" : "no_results")
          : (result.error ? "error" : "no_results"),
      }));

    if (usageLogs.length > 0) {
      await Promise.all(usageLogs.map((log) => base44.entities.ApiRequestLog.create(log)));
      queryClient.invalidateQueries({ queryKey: ["client-monthly-usage"] });
    }

    setResults(enrichmentResults);
    setIsEnriching(false);

    if (onComplete) onComplete(updatedData);
  };

  const totalFieldsUpdated = results ? Object.keys(results.fields_found).length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "hsl(217, 91%, 60%)" }} />
            Enrich Organization
          </DialogTitle>
          <DialogDescription>
            Select one or more data sources to enrich this organization record.
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4 py-1">
            {isLoadingUsage && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Checking monthly API usage...
              </div>
            )}

            <UsageLimitNotice usage={usage} requiredCredits={requiredCredits} actionLabel="This enrichment" />

            <div className="space-y-2">
              {ALL_SOURCES.map((source) => {
                const needsEin = ["CharityAPI", "NonprofitCheckPlus"].includes(source) && !organization.ein;
                return (
                  <label
                    key={source}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedSources.includes(source)
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    } ${needsEin ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Checkbox
                      checked={selectedSources.includes(source)}
                      onCheckedChange={() => !needsEin && toggleSource(source)}
                      disabled={needsEin}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-800">{SOURCE_LABELS[source]}</span>
                      {needsEin && (
                        <p className="text-xs text-slate-400 mt-0.5">EIN required</p>
                      )}
                    </div>
                    {isEnriching && currentSource === source && (
                      <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    )}
                  </label>
                );
              })}
            </div>

            {!organization.ein && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Add an EIN to enable CharityAPI and Nonprofit Check Plus enrichment.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {results.sources_checked.map((result) => (
              <div
                key={result.source}
                className={`p-3 rounded-lg border ${
                  result.success ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {result.success
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <XCircle className="w-4 h-4 text-slate-400" />}
                    <span className="font-medium text-sm">{SOURCE_LABELS[result.source]}</span>
                  </div>
                  <Badge variant={result.success ? "default" : "outline"} className="text-xs">
                    {result.fields_updated.length} fields
                  </Badge>
                </div>
                {result.error && <p className="text-xs text-slate-500">{result.error}</p>}
                {result.fields_updated.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.fields_updated.map((f) => (
                      <Badge key={f} variant="outline" className="text-xs bg-white">{f}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-900 font-medium">
                {totalFieldsUpdated} field{totalFieldsUpdated !== 1 ? "s" : ""} updated · Activity logged
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isEnriching}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEnrich}
                disabled={isEnriching || selectedSources.length === 0 || isLoadingUsage || isUsageBlocked}
                style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
                className="text-white hover:opacity-90"
              >
                {isEnriching ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Enriching{currentSource ? ` ${SOURCE_LABELS[currentSource]}...` : "..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Start Enrichment
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}