import React, { useState } from "react";
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
import { Pencil, Trash2, Sparkles, Database, Upload, CheckCircle2, Save, AlertTriangle, Hash, MapPin, Phone, Mail, Globe, DollarSign, Calendar, FileText, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import EditOrganizationDialog from "@/components/organizations/EditOrganizationDialog";
import SmartEnrichDialog from "@/components/organizations/SmartEnrichDialog";
import EnrichmentComparisonDialog from "@/components/organizations/EnrichmentComparisonDialog";
import LifecycleStageSelector from "@/components/organizations/LifecycleStageSelector";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import { Tag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";

function DataRow({ icon: Icon, label, value, isLink }) {
  if (!value || value === "N/A" || value === "Not found") return null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(214, 95%, 93%)" }}>
        <Icon className="w-5 h-5" style={{ color: "hsl(217, 91%, 60%)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
        {isLink ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline flex items-center gap-1"
            style={{ color: "hsl(217, 91%, 60%)" }}
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

export default function OrganizationSummary({ 
  organization, 
  onDelete, 
  onEdit, 
  isSaved = true,
  clientInstanceUrl 
}) {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showSmartEnrichDialog, setShowSmartEnrichDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [enrichedData, setEnrichedData] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichingSource, setEnrichingSource] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isPushingToSalesforce, setIsPushingToSalesforce] = useState(false);
  const [currentLifecycleStage, setCurrentLifecycleStage] = useState(organization.lifecycle_stage);
  const [existingRecord, setExistingRecord] = useState(null);

  const displayData = React.useMemo(() => {
    if (organization.ntee_code && !organization.ntee_description) {
      return { ...organization, ntee_description: getNTEEDescription(organization.ntee_code) };
    }
    return organization;
  }, [organization]);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const relatedContacts = await base44.entities.Contact.filter({
        organization_id: organization.id,
      });

      for (const contact of relatedContacts) {
        await base44.entities.Contact.delete(contact.id);
      }

      await base44.entities.Organization.delete(organization.id);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success(`${organization.organization_name} has been deleted successfully.`);
      setIsDeleted(true);
      setShowDeleteConfirm(false);

      if (onDelete) {
        setTimeout(() => onDelete(organization.id), 1500);
      }
    } catch (err) {
      console.error("Error deleting organization:", err);
      toast.error("Failed to delete organization.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSourceEnrich = async (source) => {
    setEnrichingSource(source);
    setIsEnriching(true);

    try {
      if (!organization.ein && ["CharityAPI", "ProPublica", "Nonprofit Check Plus"].includes(source)) {
        throw new Error("EIN is required for this data source");
      }

      let result = null;

      if (source === "CharityAPI") {
        const response = await base44.functions.invoke("charityApiSearch", { ein: organization.ein });
        result = response.data;
      } else if (source === "ProPublica") {
        const response = await base44.functions.invoke("propublicaSearch", { ein: organization.ein });
        result = response.data;
      } else if (source === "Nonprofit Check Plus") {
        const response = await base44.functions.invoke("nonprofitCheckPlusSearch", { ein: organization.ein });
        result = response.data;
      }

      if (!result) throw new Error(`No data returned from ${source}`);

      if (result.ntee_code && !result.ntee_description) {
        result.ntee_description = getNTEEDescription(result.ntee_code);
      }

      setEnrichedData(result);
      setShowComparisonDialog(true);
    } catch (err) {
      console.error(`${source} enrichment failed:`, err);
      toast.error(`Failed to fetch data from ${source}`);
    } finally {
      setIsEnriching(false);
      setEnrichingSource(null);
    }
  };

  const handlePushToSalesforce = async () => {
    setIsPushingToSalesforce(true);
    try {
      const response = await base44.functions.invoke("pushToSalesforce", { organization_id: organization.id });
      if (response.data?.success) {
        toast.success(response.data.message || "Organization successfully pushed to Salesforce!");
        if (response.data.salesforce_id && onEdit) {
          onEdit({ ...organization, salesforce_id: response.data.salesforce_id, last_salesforce_sync: new Date().toISOString() });
        }
      } else {
        toast.error(response.data?.error || "Failed to push to Salesforce.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to push to Salesforce.");
    } finally {
      setIsPushingToSalesforce(false);
    }
  };

  const handleApplyEnrichment = async (updates) => {
    let finalUpdates = { ...updates };
    if (updates.ntee_code && !updates.ntee_description) {
      const description = getNTEEDescription(updates.ntee_code);
      if (description) {
        finalUpdates.ntee_description = description;
      }
    }

    const updatedData = { ...organization, ...finalUpdates };

    if (isSaved && organization.id) {
      await base44.entities.Organization.update(organization.id, updatedData);
    }

    if (onEdit) {
      onEdit(updatedData);
    }

    setShowComparisonDialog(false);
    setEnrichedData(null);
  };

  const handleStageChange = (newStageId) => {
    setCurrentLifecycleStage(newStageId);
    if (onEdit) {
      onEdit({ ...organization, lifecycle_stage: newStageId });
    }
  };

  const formatAddress = () => {
    const parts = [organization.address, organization.city, organization.state, organization.zip_code].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  if (isDeleted) {
    return (
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="pointer-events-none"
      >
        <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white">
          <CardHeader className="text-white p-6" style={{ background: "linear-gradient(to right, hsl(217, 91%, 60%), hsl(217, 91%, 55%))" }}>
            <div className="text-center py-8">
              <p className="text-lg font-semibold">Organization deleted</p>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white">
        <CardHeader className="text-white p-6" style={{ background: "linear-gradient(to right, hsl(217, 91%, 60%), hsl(217, 91%, 55%))" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">{displayData.organization_name}</h2>
              <div className="flex flex-wrap gap-2">
                {displayData.organization_type && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">{displayData.organization_type}</Badge>
                )}
                {displayData.ntee_description && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">{displayData.ntee_description}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSmartEnrichDialog(true)}
                disabled={isEnriching || !isSaved}
                className="bg-white/90 hover:bg-white h-8 w-8 p-0"
                style={{ color: "hsl(217, 91%, 60%)" }}
                title="Smart Enrich"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isEnriching || !isSaved || !organization.ein}
                    className="bg-white/90 hover:bg-white h-8 w-8 p-0"
                    style={{ color: "hsl(217, 91%, 60%)" }}
                  >
                    <Database className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSourceEnrich("CharityAPI")} disabled={isEnriching}>
                    {enrichingSource === "CharityAPI" && <div className="w-2 h-2 border border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />}
                    CharityAPI
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSourceEnrich("ProPublica")} disabled={isEnriching}>
                    {enrichingSource === "ProPublica" && <div className="w-2 h-2 border border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />}
                    ProPublica
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSourceEnrich("Nonprofit Check Plus")} disabled={isEnriching}>
                    {enrichingSource === "Nonprofit Check Plus" && <div className="w-2 h-2 border border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />}
                    Nonprofit Check Plus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isSaved && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePushToSalesforce}
                  disabled={isPushingToSalesforce}
                  className="bg-white/90 hover:bg-white h-8 w-8 p-0"
                  style={{ color: "hsl(217, 91%, 60%)" }}
                >
                  {isPushingToSalesforce ? <div className="w-3.5 h-3.5 border border-blue-300 border-t-blue-600 rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                disabled={!isSaved}
                className="bg-white/90 hover:bg-white h-8 w-8 p-0"
                style={{ color: "hsl(217, 91%, 60%)" }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {organization.mission && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mission</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{organization.mission}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-x-8">
            <div>
              <DataRow icon={Hash} label="EIN" value={organization.ein} />
              <DataRow icon={MapPin} label="Address" value={formatAddress()} />
              <DataRow icon={Phone} label="Phone" value={organization.phone} />
              <DataRow icon={Mail} label="Email" value={organization.email} />
              <div className="flex items-start gap-3 py-3 border-b border-slate-100">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(214, 95%, 93%)" }}>
                  <Tag className="w-5 h-5" style={{ color: "hsl(217, 91%, 60%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Lifecycle Stage</p>
                  <LifecycleStageSelector
                    organizationId={organization.id}
                    clientId={organization.client_id}
                    currentStageId={currentLifecycleStage}
                    onStageChange={handleStageChange}
                  />
                </div>
              </div>
            </div>
            <div>
              <DataRow icon={Globe} label="Website" value={organization.website} isLink />
              <DataRow icon={DollarSign} label="Annual Revenue" value={organization.annual_revenue} />
              <DataRow icon={Calendar} label="Tax-Exempt Since" value={organization.ruling_date} />
              <DataRow icon={Tag} label="Classification" value={displayData.ntee_description && displayData.ntee_code ? `${displayData.ntee_description} (${displayData.ntee_code})` : displayData.ntee_description || displayData.ntee_code || null} />
              {organization.salesforce_id && (
                <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(214, 95%, 93%)" }}>
                    <Upload className="w-5 h-5" style={{ color: "hsl(217, 91%, 60%)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Salesforce</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <a
                        href={`${clientInstanceUrl}/${organization.salesforce_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline flex items-center gap-1"
                        style={{ color: "hsl(217, 91%, 60%)" }}
                      >
                        {organization.salesforce_id}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {organization.last_salesforce_sync && (
                        <span className="text-xs text-slate-400">
                          (synced {moment(organization.last_salesforce_sync).format("MMM D, YYYY h:mm A")})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <EditOrganizationDialog
        organization={organization}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={(updatedData) => {
          if (onEdit) onEdit(updatedData);
        }}
      />

      <EnrichmentComparisonDialog
        open={showComparisonDialog}
        onOpenChange={setShowComparisonDialog}
        currentData={organization}
        enrichedData={enrichedData}
        onApply={handleApplyEnrichment}
      />

      <SmartEnrichDialog
        open={showSmartEnrichDialog}
        onOpenChange={setShowSmartEnrichDialog}
        organization={organization}
        onComplete={(updatedData) => {
          if (onEdit) onEdit(updatedData);
          setShowSmartEnrichDialog(false);
        }}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{organization.organization_name}</strong> and all related data.
              <span className="block mt-3 font-semibold text-red-600">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}