import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Pencil, Trash2, Sparkles, Database, Upload, CheckCircle2, XCircle, Loader2, Hash, MapPin, Phone, Mail, Globe, DollarSign, Calendar, FileText, ExternalLink, Tag } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import SmartEnrichDialog from "@/components/organizations/SmartEnrichDialog";
import EnrichmentComparisonDialog from "@/components/organizations/EnrichmentComparisonDialog";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";

function OrgLogo({ logoUrl, name }) {
  const [imgError, setImgError] = useState(false);
  const initials = name ? name.charAt(0).toUpperCase() : "?";
  return (
    <div className="w-16 h-16 rounded-full flex-shrink-0 border-2 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center">
      {logoUrl && !imgError ? (
        <img src={logoUrl} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <span className="text-white text-xl font-bold">{initials}</span>
      )}
    </div>
  );
}

// Inline editable field — click value to edit, Enter/blur to save, Escape to cancel
function EditableField({ icon: Icon, label, value, onSave, multiline = false, isLink = false, placeholder = "Click to add..." }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(value || "");
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft !== (value || "")) onSave(draft || null);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value || "");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !multiline) { e.preventDefault(); commit(); }
    if (e.key === "Escape") cancel();
  };

  const displayValue = value && value !== "N/A" && value !== "Not found" ? value : null;

  return (
    <div className="group flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(214, 95%, 93%)" }}>
        <Icon className="w-5 h-5" style={{ color: "hsl(217, 91%, 60%)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
        {editing ? (
          multiline ? (
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              rows={3}
              className="text-sm mt-1"
            />
          ) : (
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              className="text-sm h-8 mt-0.5"
            />
          )
        ) : (
          <div
            className="cursor-pointer rounded px-1 -mx-1 hover:bg-slate-100 transition-colors min-h-[1.5rem] flex items-center"
            onClick={startEdit}
            title="Click to edit"
          >
            {displayValue ? (
              isLink ? (
                <a
                  href={displayValue.startsWith("http") ? displayValue : `https://${displayValue}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline flex items-center gap-1"
                  style={{ color: "hsl(217, 91%, 60%)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayValue}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-sm text-slate-800 break-words">{displayValue}</p>
              )
            ) : (
              <p className="text-sm text-slate-400 italic">{placeholder}</p>
            )}
            <Pencil className="w-3 h-3 text-slate-300 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}

// Special inline NTEE field with validation
function EditableNTEEField({ nteeCode, nteeDescription, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nteeCode || "");
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState({ status: null, description: null });
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(nteeCode || "");
    setValidation({ status: null, description: null });
    setEditing(true);
  };

  const handleChange = (val) => {
    setDraft(val);
    setValidation({ status: null, description: null });
    clearTimeout(window._nteeTimer);
    window._nteeTimer = setTimeout(async () => {
      if (!val.trim()) return;
      setValidating(true);
      try {
        const response = await base44.functions.invoke('validateNTEECode', { code: val });
        if (response.data.valid) {
          setValidation({ status: 'valid', description: response.data.description });
        } else {
          setValidation({ status: 'invalid', description: null });
        }
      } catch {
        setValidation({ status: 'error', description: null });
      } finally {
        setValidating(false);
      }
    }, 500);
  };

  const commit = () => {
    setEditing(false);
    if (draft !== (nteeCode || "")) {
      onSave(draft || null, validation.description || null);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(nteeCode || "");
  };

  const displayValue = nteeDescription && nteeCode
    ? `${nteeDescription} (${nteeCode})`
    : nteeDescription || nteeCode || null;

  return (
    <div className="group flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(214, 95%, 93%)" }}>
        <Tag className="w-5 h-5" style={{ color: "hsl(217, 91%, 60%)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Classification</p>
        {editing ? (
          <div>
            <div className="relative">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") cancel(); }}
                className={`text-sm h-8 mt-0.5 pr-8 ${validation.status === 'invalid' ? 'border-red-400' : validation.status === 'valid' ? 'border-green-400' : ''}`}
                placeholder="e.g. B20"
              />
              {validating && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-slate-400" />}
              {!validating && validation.status === 'valid' && <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-green-500" />}
              {!validating && validation.status === 'invalid' && <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-red-500" />}
            </div>
            {validation.status === 'valid' && validation.description && (
              <p className="text-xs text-green-600 mt-1">{validation.description}</p>
            )}
            {validation.status === 'invalid' && <p className="text-xs text-red-500 mt-1">Invalid NTEE code</p>}
          </div>
        ) : (
          <div
            className="cursor-pointer rounded px-1 -mx-1 hover:bg-slate-100 transition-colors min-h-[1.5rem] flex items-center"
            onClick={startEdit}
            title="Click to edit"
          >
            {displayValue
              ? <p className="text-sm text-slate-800 break-words">{displayValue}</p>
              : <p className="text-sm text-slate-400 italic">Click to add...</p>
            }
            <Pencil className="w-3 h-3 text-slate-300 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
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
  const [showSmartEnrichDialog, setShowSmartEnrichDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [enrichedData, setEnrichedData] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichingSource, setEnrichingSource] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isPushingToSalesforce, setIsPushingToSalesforce] = useState(false);
  const [clientStatus, setClientStatus] = useState(organization.client_status || "active");

  const displayData = React.useMemo(() => {
    if (organization.ntee_code && !organization.ntee_description) {
      return { ...organization, ntee_description: getNTEEDescription(organization.ntee_code) };
    }
    return organization;
  }, [organization]);

  const saveField = async (field, value) => {
    if (!isSaved || !organization.id) return;
    const updatedData = { ...organization, [field]: value };
    await base44.entities.Organization.update(organization.id, updatedData);
    if (onEdit) onEdit(updatedData);
  };

  const saveNTEE = async (code, description) => {
    if (!isSaved || !organization.id) return;
    const updatedData = { ...organization, ntee_code: code, ntee_description: description || getNTEEDescription(code) || organization.ntee_description };
    await base44.entities.Organization.update(organization.id, updatedData);
    if (onEdit) onEdit(updatedData);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const relatedContacts = await base44.entities.Contact.filter({ organization_id: organization.id });
      for (const contact of relatedContacts) {
        await base44.entities.Contact.delete(contact.id);
      }
      await base44.entities.Organization.delete(organization.id);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success(`${organization.organization_name} has been deleted successfully.`);
      setIsDeleted(true);
      setShowDeleteConfirm(false);
      if (onDelete) setTimeout(() => onDelete(organization.id), 1500);
    } catch (err) {
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
      if (description) finalUpdates.ntee_description = description;
    }
    const updatedData = { ...organization, ...finalUpdates };
    if (isSaved && organization.id) {
      await base44.entities.Organization.update(organization.id, updatedData);
    }
    if (onEdit) onEdit(updatedData);
    setShowComparisonDialog(false);
    setEnrichedData(null);
  };

  const handleStatusToggle = () => {
    const newStatus = clientStatus === "active" ? "inactive" : "active";
    setClientStatus(newStatus);
    if (onEdit) onEdit({ ...organization, client_status: newStatus });
  };

  if (isDeleted) {
    return (
      <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="pointer-events-none">
        <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white">
          <CardHeader className="text-white p-6" style={{ background: "linear-gradient(to right, hsl(217, 91%, 60%), hsl(217, 91%, 55%))" }}>
            <div className="text-center py-8"><p className="text-lg font-semibold">Organization deleted</p></div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white">
        {/* Header */}
        <CardHeader className="text-white p-6" style={{ background: "linear-gradient(to right, hsl(217, 91%, 60%), hsl(217, 91%, 55%))" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <OrgLogo logoUrl={displayData.logo_url} name={displayData.organization_name} />
              <div className="flex-1">
                {/* Inline editable name */}
                <InlineHeaderText
                  value={displayData.organization_name}
                  onSave={(val) => saveField("organization_name", val)}
                />
                <div className="flex flex-wrap gap-2 mt-1">
                  {displayData.organization_type && (
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">{displayData.organization_type}</Badge>
                  )}
                  {displayData.ntee_description && (
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">{displayData.ntee_description}</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              {/* Active/Inactive toggle */}
              <div className="flex items-center justify-center h-8 px-2">
                <div
                  style={{ backgroundColor: clientStatus === "active" ? "hsl(142, 76%, 36%)" : "hsl(210, 40%, 96%)" }}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors"
                  onClick={handleStatusToggle}
                >
                  <div className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${clientStatus === "active" ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowSmartEnrichDialog(true)} disabled={isEnriching || !isSaved} className="bg-white/90 hover:bg-white h-8 w-8 p-0" style={{ color: "hsl(217, 91%, 60%)" }} title="Smart Enrich">
                <Sparkles className="w-3.5 h-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" disabled={isEnriching || !isSaved || !organization.ein} className="bg-white/90 hover:bg-white h-8 w-8 p-0" style={{ color: "hsl(217, 91%, 60%)" }}>
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
                <Button variant="secondary" size="sm" onClick={handlePushToSalesforce} disabled={isPushingToSalesforce} className="bg-white/90 hover:bg-white h-8 w-8 p-0" style={{ color: "hsl(217, 91%, 60%)" }}>
                  {isPushingToSalesforce ? <div className="w-3.5 h-3.5 border border-blue-300 border-t-blue-600 rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting} className="h-8 w-8 p-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Mission — full width inline editable */}
          <div className="mb-6">
            <EditableField
              icon={FileText}
              label="Mission"
              value={organization.mission}
              onSave={(val) => saveField("mission", val)}
              multiline
              placeholder="Click to add mission statement..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-x-8">
            <div>
              <EditableField icon={Hash} label="Organization Name" value={organization.organization_name} onSave={(val) => saveField("organization_name", val)} placeholder="Organization name..." />
              <EditableField icon={Hash} label="EIN" value={organization.ein} onSave={(val) => saveField("ein", val)} placeholder="XX-XXXXXXX" />
              <EditableField icon={Hash} label="Organization Type" value={organization.organization_type} onSave={(val) => saveField("organization_type", val)} placeholder="e.g. 501(c)(3)" />
              <EditableField icon={MapPin} label="Address" value={organization.address} onSave={(val) => saveField("address", val)} placeholder="Street address..." />
              <EditableField icon={MapPin} label="City" value={organization.city} onSave={(val) => saveField("city", val)} placeholder="City..." />
              <EditableField icon={MapPin} label="State" value={organization.state} onSave={(val) => saveField("state", val)} placeholder="State..." />
              <EditableField icon={MapPin} label="ZIP Code" value={organization.zip_code} onSave={(val) => saveField("zip_code", val)} placeholder="ZIP..." />
            </div>
            <div>
              <EditableField icon={Phone} label="Phone" value={organization.phone} onSave={(val) => saveField("phone", val)} placeholder="Phone number..." />
              <EditableField icon={Mail} label="Email" value={organization.email} onSave={(val) => saveField("email", val)} placeholder="Email address..." />
              <EditableField icon={Globe} label="Website" value={organization.website} onSave={(val) => saveField("website", val)} isLink placeholder="Website URL..." />
              <EditableField icon={DollarSign} label="Annual Revenue" value={organization.annual_revenue} onSave={(val) => saveField("annual_revenue", val)} placeholder="e.g. $1,000,000" />
              <EditableField icon={Calendar} label="Tax-Exempt Since" value={organization.ruling_date} onSave={(val) => saveField("ruling_date", val)} placeholder="e.g. 1995-01-01" />
              <EditableNTEEField
                nteeCode={displayData.ntee_code}
                nteeDescription={displayData.ntee_description}
                onSave={saveNTEE}
              />
              {organization.salesforce_id && (
                <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(214, 95%, 93%)" }}>
                    <Upload className="w-5 h-5" style={{ color: "hsl(217, 91%, 60%)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Salesforce</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <a href={`${clientInstanceUrl}/${organization.salesforce_id}`} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex items-center gap-1" style={{ color: "hsl(217, 91%, 60%)" }}>
                        {organization.salesforce_id}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {organization.last_salesforce_sync && (
                        <span className="text-xs text-slate-400">(synced {moment(organization.last_salesforce_sync).format("MMM D, YYYY h:mm A")})</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

// Inline editable header title (white text on gradient)
function InlineHeaderText({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  return editing ? (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
      className="text-xl font-semibold bg-white/20 text-white placeholder-white/60 border-b-2 border-white/50 outline-none w-full"
    />
  ) : (
    <h2
      className="text-xl font-semibold cursor-pointer hover:bg-white/10 rounded px-1 -mx-1 transition-colors"
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      {value}
    </h2>
  );
}