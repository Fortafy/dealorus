import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditOrganizationDialog from "@/components/organizations/EditOrganizationDialog";
import EnrichmentComparisonDialog from "@/components/organizations/EnrichmentComparisonDialog";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Hash,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Save,
  ExternalLink,
  CheckCircle2,
  Pencil,
  Trash2,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";

function DataRow({ icon: Icon, label, value, isLink }) {
  if (!value || value === "N/A" || value === "Not found") return null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        {isLink ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
          >
            {value}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm text-slate-800 break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function OrganizationCard({ data, onSave, isSaved, onDelete, onEdit }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichingSource, setEnrichingSource] = useState(null);
  const [existingRecord, setExistingRecord] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [enrichedData, setEnrichedData] = useState(null);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);

  useEffect(() => {
    checkForDuplicate();
  }, [data.ein, data.organization_name, data.address]);

  const checkForDuplicate = async () => {
    try {
      const allOrgs = await base44.entities.SearchResult.list();
      
      const duplicate = allOrgs.find(org => {
        // Match by EIN if both have it
        if (data.ein && org.ein && data.ein === org.ein) return true;
        
        // Match by name and address
        if (data.organization_name && org.organization_name &&
            data.organization_name.toLowerCase() === org.organization_name.toLowerCase()) {
          // If addresses match too, it's definitely a duplicate
          if (data.address && org.address && 
              data.address.toLowerCase() === org.address.toLowerCase()) {
            return true;
          }
          // If same name and state, likely duplicate
          if (data.state && org.state && data.state === org.state) {
            return true;
          }
        }
        
        return false;
      });
      
      setExistingRecord(duplicate || null);
    } catch (err) {
      console.error("Error checking for duplicates:", err);
    }
  };

  const handleSaveClick = () => {
    if (existingRecord) {
      setShowUpdateDialog(true);
    } else {
      onSave(data);
    }
  };

  const handleConfirmUpdate = async () => {
    await base44.entities.SearchResult.update(existingRecord.id, data);
    setShowUpdateDialog(false);
    // Don't call onSave as that creates a new record - we just updated existing
    if (onEdit) {
      onEdit({ ...data, id: existingRecord.id });
    }
  };

  const formatAddress = () => {
    const parts = [data.address, data.city, data.state, data.zip_code].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleEdit = (updatedData) => {
    if (onEdit) {
      onEdit(updatedData);
    }
  };

  const handleAIEnrich = async () => {
    setIsEnriching(true);

    const prompt = `Enrich and improve the following organization data:

    Organization: ${data.organization_name}
    State: ${data.state}
    EIN: ${data.ein || "Not provided"}
    Address: ${data.address || "Not provided"}
    City: ${data.city || "Not provided"}
    ZIP: ${data.zip_code || "Not provided"}
    NTEE Code: ${data.ntee_code || "Not provided"}
    Mission: ${data.mission || "Not provided"}

    Tasks:
    1. Verify and standardize the address format (use proper USPS format)
    2. Find the EIN if missing, verify if provided
    3. Find the NTEE code if missing, verify if provided
    4. For the NTEE code, provide the full description (e.g., A03 = "Professional Societies & Associations")
    5. If mission exists, summarize it into 2-3 concise key points
    6. Keep all other fields unchanged

    Return the enriched data with these exact fields:
    - address: Standardized street address
    - city: City name
    - zip_code: ZIP code
    - ein: EIN in XX-XXXXXXX format
    - ntee_code: NTEE code
    - ntee_description: Full description of the NTEE code
    - mission: Summarized mission (if original exists, otherwise keep original)`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            address: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
            zip_code: { type: ["string", "null"] },
            ein: { type: ["string", "null"] },
            ntee_code: { type: ["string", "null"] },
            ntee_description: { type: ["string", "null"] },
            mission: { type: ["string", "null"] },
          },
        },
      });

      // Auto-map NTEE code to description if code exists but description doesn't
      if (result.ntee_code && !result.ntee_description) {
        result.ntee_description = getNTEEDescription(result.ntee_code);
      }

      setEnrichedData(result);
      setShowComparisonDialog(true);
      } catch (err) {
      console.error("AI enrichment failed:", err);
      } finally {
      setIsEnriching(false);
      }
      };

  const handleSourceEnrich = async (source) => {
    setEnrichingSource(source);
    setIsEnriching(true);

    try {
      let result = null;

      // Check if EIN is available for API calls
      if (!data.ein && ['CharityAPI', 'ProPublica', 'Nonprofit Check Plus'].includes(source)) {
        throw new Error('EIN is required for this data source');
      }

      // Call direct API functions for supported sources
      if (source === 'CharityAPI') {
        const response = await base44.functions.invoke('charityApiSearch', { ein: data.ein });
        result = response.data;
      } else if (source === 'ProPublica') {
        const response = await base44.functions.invoke('propublicaSearch', { ein: data.ein });
        result = response.data;
      } else if (source === 'Nonprofit Check Plus') {
        const response = await base44.functions.invoke('nonprofitCheckPlusSearch', { ein: data.ein });
        result = response.data;
      }

      if (!result) {
        throw new Error(`No data returned from ${source}`);
      }

      // Auto-map NTEE code to description if code exists but description doesn't
      if (result.ntee_code && !result.ntee_description) {
        result.ntee_description = await getNTEEDescription(result.ntee_code);
      }

      setEnrichedData(result);
      setShowComparisonDialog(true);
    } catch (err) {
      console.error(`${source} enrichment failed:`, err);
      alert(`Failed to fetch data from ${source}: ${err.message}`);
    } finally {
      setIsEnriching(false);
      setEnrichingSource(null);
    }
  };

  const handleApplyEnrichment = async (updates) => {
    // Auto-populate ntee_description if ntee_code is updated but description is missing
    let finalUpdates = { ...updates };
    if (updates.ntee_code && !updates.ntee_description) {
      const description = await getNTEEDescription(updates.ntee_code);
      if (description) {
        finalUpdates.ntee_description = description;
      }
    }

    const updatedData = {
      ...data,
      ...finalUpdates,
    };

    if (onEdit) {
      onEdit(updatedData);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">{data.organization_name}</h2>
              <div className="flex flex-wrap gap-2">
                {data.organization_type && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    {data.organization_type}
                  </Badge>
                )}
                {data.ntee_description && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    {data.ntee_description}
                  </Badge>
                )}
                {data.ntee_code && !data.ntee_description && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    NTEE: {data.ntee_code}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              {existingRecord && !isSaved && (
                <Badge className="bg-yellow-500 text-white border-0 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Duplicate Found
                </Badge>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveClick}
                disabled={isSaved}
                className={`flex-shrink-0 h-8 w-8 p-0 ${isSaved ? "bg-green-100 text-green-700" : existingRecord ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-white/90 text-indigo-700 hover:bg-white"}`}
                title={isSaved ? "Saved" : existingRecord ? "Update Existing" : "Save"}
              >
                {isSaved ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAIEnrich}
                disabled={isEnriching}
                className="bg-white/90 text-indigo-700 hover:bg-white h-8 w-8 p-0"
                title="AI Enrich"
              >
                {isEnriching ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-700/30 border-t-indigo-700 rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="bg-white/90 text-indigo-700 hover:bg-white h-8 w-8 p-0"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(data.id)}
                  className="h-8 w-8 p-0"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {data.mission && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mission</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{data.mission}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-x-8">
            <div>
              <DataRow icon={Hash} label="EIN" value={data.ein} />
              <DataRow icon={MapPin} label="Address" value={formatAddress()} />
              <DataRow icon={Phone} label="Phone" value={data.phone} />
              <DataRow icon={Mail} label="Email" value={data.email} />
            </div>
            <div>
              <DataRow icon={Globe} label="Website" value={data.website} isLink />
              <DataRow icon={DollarSign} label="Annual Revenue" value={data.annual_revenue} />
              <DataRow icon={Calendar} label="Tax-Exempt Since" value={data.ruling_date} />
              <DataRow icon={Tag} label="Classification" value={data.ntee_description && data.ntee_code ? `${data.ntee_description} (${data.ntee_code})` : data.ntee_description || data.ntee_code || null} />
            </div>
          </div>

          {data.data_sources && data.data_sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Data sources: {data.data_sources.join(", ")}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSourceEnrich('CharityAPI')}
                  disabled={isEnriching || !data.ein}
                  className="h-7 text-xs"
                  title={!data.ein ? "EIN required" : "Fetch from CharityAPI"}
                >
                  {enrichingSource === 'CharityAPI' ? (
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-1" />
                  ) : null}
                  CharityAPI
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSourceEnrich('ProPublica')}
                  disabled={isEnriching || !data.ein}
                  className="h-7 text-xs"
                  title={!data.ein ? "EIN required" : "Fetch from ProPublica"}
                >
                  {enrichingSource === 'ProPublica' ? (
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-1" />
                  ) : null}
                  ProPublica
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSourceEnrich('Nonprofit Check Plus')}
                  disabled={isEnriching || !data.ein}
                  className="h-7 text-xs"
                  title={!data.ein ? "EIN required" : "Fetch from Nonprofit Check Plus"}
                >
                  {enrichingSource === 'Nonprofit Check Plus' ? (
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-1" />
                  ) : null}
                  Nonprofit Check Plus
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={true}
                  className="h-7 text-xs opacity-40 cursor-not-allowed"
                  title="Coming soon"
                >
                  Charity Navigator
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={true}
                  className="h-7 text-xs opacity-40 cursor-not-allowed"
                  title="Coming soon"
                >
                  IRS Ezar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={true}
                  className="h-7 text-xs opacity-40 cursor-not-allowed"
                  title="Coming soon"
                >
                  GuideStar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditOrganizationDialog
        organization={data}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEdit}
      />

      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Existing Record?</AlertDialogTitle>
            <AlertDialogDescription>
              A record for <strong>{data.organization_name}</strong> already exists in your database.
              {existingRecord?.ein && data.ein && existingRecord.ein === data.ein && (
                <span className="block mt-2">Matching EIN: {data.ein}</span>
              )}
              <span className="block mt-3">
                Would you like to update the existing record with this new data, or cancel to avoid duplicates?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdate}>
              Update Existing Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EnrichmentComparisonDialog
        open={showComparisonDialog}
        onOpenChange={setShowComparisonDialog}
        currentData={data}
        enrichedData={enrichedData}
        onApply={handleApplyEnrichment}
      />
    </motion.div>
  );
}