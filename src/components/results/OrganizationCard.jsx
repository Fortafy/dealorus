import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import SmartEnrichDialog from "@/components/organizations/SmartEnrichDialog";
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
  AlertTriangle,
  Database,
  Clock
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import { getDataSourceLinks } from "@/components/utils/dataSourceLinks";
import { normalizeEIN } from "@/components/utils/einFormatter";
import { Award, FileCheck, Link2, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function DataRow({ icon: Icon, label, value, isLink }) {
  if (!value || value === "N/A" || value === "Not found") return null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(214, 95%, 93%)' }}>
        <Icon className="w-5 h-5" style={{ color: 'hsl(217, 91%, 60%)' }} />
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
            className="text-sm hover:underline flex items-center gap-1"
            style={{ color: 'hsl(217, 91%, 60%)' }}
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

export default function OrganizationCard({ data, onSave, onUpdate, isSaved, onDelete, onEdit }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichingSource, setEnrichingSource] = useState(null);
  const [existingRecord, setExistingRecord] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [enrichedData, setEnrichedData] = useState(null);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const [showSmartEnrichDialog, setShowSmartEnrichDialog] = useState(false);
  const [isDataFreshnessOpen, setIsDataFreshnessOpen] = useState(false);

  // Auto-populate NTEE description from code if missing
  const displayData = React.useMemo(() => {
    if (data.ntee_code && !data.ntee_description) {
      return {
        ...data,
        ntee_description: getNTEEDescription(data.ntee_code)
      };
    }
    return data;
  }, [data]);

  useEffect(() => {
    checkForDuplicate();
  }, [data.ein, data.organization_name, data.address]);

  // Update database if NTEE description is auto-populated for saved records
  useEffect(() => {
    if (isSaved && data.id && data.ntee_code && !data.ntee_description) {
      const description = getNTEEDescription(data.ntee_code);
      if (description && onEdit) {
        const updatedData = { ...data, ntee_description: description };
        base44.entities.Organization.update(data.id, updatedData).then(() => {
          onEdit(updatedData);
        });
      }
    }
  }, [data.id, data.ntee_code, data.ntee_description, isSaved]);

  const checkForDuplicate = async () => {
    try {
      const allOrgs = await base44.entities.Organization.list();
      
      const duplicate = allOrgs.find(org => {
        // Match by EIN if both have it (compare normalized versions without dashes)
        if (data.ein && org.ein) {
          const normalizedDataEin = normalizeEIN(data.ein);
          const normalizedOrgEin = normalizeEIN(org.ein);
          if (normalizedDataEin === normalizedOrgEin) return true;
        }
        
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
    setShowUpdateDialog(false);
    if (onUpdate) {
      await onUpdate(existingRecord.id, data);
    } else if (onEdit) {
      await base44.entities.Organization.update(existingRecord.id, data);
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
        result.ntee_description = getNTEEDescription(result.ntee_code);
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

  const handleSmartEnrichComplete = (updatedData) => {
    if (onEdit) {
      onEdit(updatedData);
    }
    setShowSmartEnrichDialog(false);
  };

  const formatLastChecked = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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

    // If this is a saved record, update it in the database
    if (isSaved && data.id) {
      await base44.entities.Organization.update(data.id, updatedData);
    }

    // Notify parent to refresh
    if (onEdit) {
      onEdit(updatedData);
    }

    // Close dialog and clear state
    setShowComparisonDialog(false);
    setEnrichedData(null);
  };

  const dataSourceLinks = getDataSourceLinks(data);
  
  const getIconComponent = (iconName) => {
    const icons = {
      'FileText': FileText,
      'Building2': Building2,
      'FileCheck': FileCheck,
      'Award': Award,
      'Globe': Globe,
    };
    return icons[iconName] || Link2;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white">
        <CardHeader className="text-white p-6" style={{ background: 'linear-gradient(to right, hsl(217, 91%, 60%), hsl(217, 91%, 55%))' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">{displayData.organization_name}</h2>
              <div className="flex flex-wrap gap-2">
                {displayData.organization_type && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    {displayData.organization_type}
                  </Badge>
                )}
                {displayData.ntee_description && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    {displayData.ntee_description}
                  </Badge>
                )}
                {displayData.ntee_code && !displayData.ntee_description && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    NTEE: {displayData.ntee_code}
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
                className={`flex-shrink-0 h-8 w-8 p-0 ${isSaved ? "bg-green-100 text-green-700" : existingRecord ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-white/90 hover:bg-white"}`}
                style={!isSaved && !existingRecord ? { color: 'hsl(217, 91%, 60%)' } : {}}
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
                onClick={() => setShowSmartEnrichDialog(true)}
                disabled={isEnriching || !isSaved}
                className="bg-white/90 hover:bg-white h-8 w-8 p-0"
                style={{ color: 'hsl(217, 91%, 60%)' }}
                title="Smart Enrich (Multi-Source)"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isEnriching || !data.ein}
                    className="bg-white/90 hover:bg-white h-8 w-8 p-0"
                    style={{ color: 'hsl(217, 91%, 60%)' }}
                    title="Enrich from data sources"
                  >
                    <Database className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSourceEnrich('CharityAPI')} disabled={isEnriching}>
                    {enrichingSource === 'CharityAPI' && <div className="w-2 h-2 border border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />}
                    CharityAPI
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSourceEnrich('ProPublica')} disabled={isEnriching}>
                    {enrichingSource === 'ProPublica' && <div className="w-2 h-2 border border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />}
                    ProPublica
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSourceEnrich('Nonprofit Check Plus')} disabled={isEnriching}>
                    {enrichingSource === 'Nonprofit Check Plus' && <div className="w-2 h-2 border border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />}
                    Nonprofit Check Plus
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                    Candid
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                    IRS Ezar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="bg-white/90 hover:bg-white h-8 w-8 p-0"
                style={{ color: 'hsl(217, 91%, 60%)' }}
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
          {displayData.mission && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mission</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{displayData.mission}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-x-8">
            <div>
              <DataRow icon={Hash} label="EIN" value={displayData.ein} />
              <DataRow icon={MapPin} label="Address" value={formatAddress()} />
              <DataRow icon={Phone} label="Phone" value={displayData.phone} />
              <DataRow icon={Mail} label="Email" value={displayData.email} />
            </div>
            <div>
              <DataRow icon={Globe} label="Website" value={displayData.website} isLink />
              <DataRow icon={DollarSign} label="Annual Revenue" value={displayData.annual_revenue} />
              <DataRow icon={Calendar} label="Tax-Exempt Since" value={displayData.ruling_date} />
              <DataRow icon={Tag} label="Classification" value={displayData.ntee_description && displayData.ntee_code ? `${displayData.ntee_description} (${displayData.ntee_code})` : displayData.ntee_description || displayData.ntee_code || null} />
            </div>
          </div>

          {displayData.source_metadata && Object.keys(displayData.source_metadata).length > 0 && (
            <Collapsible open={isDataFreshnessOpen} onOpenChange={setIsDataFreshnessOpen} className="mt-6 pt-4 border-t border-slate-100">
              <CollapsibleTrigger className="flex items-center justify-between w-full group mb-3 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Data Freshness
                  </h3>
                </div>
                {isDataFreshnessOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(displayData.source_metadata).map(([source, metadata]) => (
                    <div key={source} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="text-xs font-medium text-slate-700">{source}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatLastChecked(metadata.last_checked)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {dataSourceLinks.length > 0 && (
            <Collapsible open={isDataSourcesOpen} onOpenChange={setIsDataSourcesOpen} className="mt-6 pt-4 border-t border-slate-100">
              <CollapsibleTrigger className="flex items-center justify-between w-full group mb-3 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Public Data Sources
                  </h3>
                  <span className="text-xs text-slate-400">({dataSourceLinks.length})</span>
                </div>
                {isDataSourcesOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid md:grid-cols-2 gap-2">
                  {dataSourceLinks.map((link, index) => {
                    const IconComponent = getIconComponent(link.icon);
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 transition-all group"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: 'hsl(214, 95%, 93%)' }}>
                          <IconComponent className="w-4 h-4" style={{ color: 'hsl(217, 91%, 60%)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium text-slate-900 group-hover:underline">
                              {link.name}
                            </p>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{link.description}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
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

      <SmartEnrichDialog
        open={showSmartEnrichDialog}
        onOpenChange={setShowSmartEnrichDialog}
        organization={data}
        onComplete={handleSmartEnrichComplete}
        organizationSettings={data.organizationSettings}
      />
      </motion.div>
      );
      }