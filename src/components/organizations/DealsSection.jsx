import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";

const SERVICE_NAMES = [
  "Salesforce Administration",
  "Wordpress Administration",
  "Salesforce Development",
  "Wordpress Development",
  "Technical Assessment",
  "Data Management",
  "Data Hygiene",
];

const CONTRACT_TYPES = [
  { value: "monthly_retainer", label: "Monthly Retainer" },
  { value: "ad_hoc", label: "Ad Hoc" },
  { value: "project", label: "Project" },
];

const emptyService = () => ({ service_name: "", hours_per_month: "", total_estimated_hours: "", rate: "", overage_rate: "" });

const emptyForm = () => ({
  name: "", stage: "", contract_type: "", start_date: "", end_date: "",
  expected_close_date: "", value: "", description: "", services: [emptyService()],
});

const dealToForm = (deal) => ({
  name: deal.name || "",
  stage: deal.stage || "",
  contract_type: deal.contract_type || "",
  start_date: deal.start_date || "",
  end_date: deal.end_date || "",
  expected_close_date: deal.expected_close_date || "",
  value: deal.value != null ? String(deal.value) : "",
  description: deal.description || "",
  services: deal.services?.length ? deal.services.map((s) => ({
    service_name: s.service_name || "",
    hours_per_month: s.hours_per_month != null ? String(s.hours_per_month) : "",
    total_estimated_hours: s.total_estimated_hours != null ? String(s.total_estimated_hours) : "",
    rate: s.rate != null ? String(s.rate) : "",
    overage_rate: s.overage_rate != null ? String(s.overage_rate) : "",
  })) : [emptyService()],
});

export default function DealsSection({ organization, clientId, clientLifecycleStages = [] }) {
  const queryClient = useQueryClient();
  const [showDealForm, setShowDealForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", organization.id],
    queryFn: () => base44.entities.Deal.filter({ organization_id: organization.id }, "-created_date"),
  });

  const createDealMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Deal.create({ ...data, client_id: clientId, organization_id: organization.id, organization_name: organization.organization_name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal created");
      closeForm();
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal updated");
      closeForm();
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: (id) => base44.entities.Deal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal deleted");
      setDeleteTarget(null);
    },
  });

  const openCreate = () => { setEditingDeal(null); setForm(emptyForm()); setShowDealForm(true); };
  const openEdit = (deal) => { setEditingDeal(deal); setForm(dealToForm(deal)); setShowDealForm(true); };
  const closeForm = () => { setShowDealForm(false); setEditingDeal(null); setForm(emptyForm()); };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setServiceField = (index, key, value) => setForm((f) => {
    const services = [...f.services];
    services[index] = { ...services[index], [key]: value };
    return { ...f, services };
  });
  const addService = () => setForm((f) => ({ ...f, services: [...f.services, emptyService()] }));
  const removeService = (index) => setForm((f) => ({ ...f, services: f.services.filter((_, i) => i !== index) }));

  const buildPayload = () => {
    const services = form.services
      .filter((s) => s.service_name)
      .map((s) => ({
        service_name: s.service_name,
        ...(s.hours_per_month !== "" && { hours_per_month: parseFloat(s.hours_per_month) }),
        ...(s.total_estimated_hours !== "" && { total_estimated_hours: parseFloat(s.total_estimated_hours) }),
        ...(s.rate !== "" && { rate: parseFloat(s.rate) }),
        ...(s.overage_rate !== "" && { overage_rate: parseFloat(s.overage_rate) }),
      }));
    return {
      name: form.name,
      stage: form.stage,
      contract_type: form.contract_type || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      expected_close_date: form.expected_close_date || null,
      value: form.value ? parseFloat(form.value) : null,
      description: form.description || null,
      services,
      is_active: true,
    };
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.stage) {
      toast.error("Please fill in deal name and stage");
      return;
    }
    const payload = buildPayload();
    if (editingDeal) {
      updateDealMutation.mutate({ id: editingDeal.id, data: payload });
    } else {
      createDealMutation.mutate(payload);
    }
  };

  const getStageLabel = (stageId) => clientLifecycleStages.find((s) => s.id === stageId)?.name || stageId;
  const isProject = form.contract_type === "project";
  const isRetainer = form.contract_type === "monthly_retainer";
  const isPending = createDealMutation.isPending || updateDealMutation.isPending;

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 group hover:opacity-80 transition-opacity">
              <CardTitle className="text-base">Deals ({deals.length})</CardTitle>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </CollapsibleTrigger>
            <Button size="sm" onClick={openCreate} style={{ backgroundColor: "hsl(217, 91%, 60%)" }} className="text-white hover:opacity-90 h-7 px-2">
              <Plus className="w-3 h-3 mr-1" />
              New Deal
            </Button>
          </div>
        </Collapsible>
      </CardHeader>

      {/* Create / Edit Dialog */}
      <Dialog open={showDealForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeal ? "Edit Deal" : "New Deal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Deal Name *</label>
                <Input placeholder="Deal name..." value={form.name} onChange={(e) => setField("name", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Stage *</label>
                <select value={form.stage} onChange={(e) => setField("stage", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
                  <option value="">Select stage...</option>
                  {clientLifecycleStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Contract Type</label>
                <select value={form.contract_type} onChange={(e) => setField("contract_type", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
                  <option value="">Select type...</option>
                  {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
                <Input type="date" value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">End Date</label>
                <Input type="date" value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Expected Close Date</label>
                <Input type="date" value={form.expected_close_date} onChange={(e) => setField("expected_close_date", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Deal Value ($)</label>
                <Input type="number" placeholder="0.00" value={form.value} onChange={(e) => setField("value", e.target.value)} className="text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                <Textarea placeholder="Additional notes..." value={form.description} onChange={(e) => setField("description", e.target.value)} className="text-sm h-16" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Services</p>
                <Button size="sm" variant="outline" onClick={addService} className="h-6 px-2 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Add Service
                </Button>
              </div>
              <div className="space-y-3">
                {form.services.map((svc, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative">
                    {form.services.length > 1 && (
                      <button onClick={() => removeService(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="text-xs text-slate-500 mb-1 block">Service</label>
                        <select value={svc.service_name} onChange={(e) => setServiceField(idx, "service_name", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
                          <option value="">Select service...</option>
                          {SERVICE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Hourly Rate ($)</label>
                        <Input type="number" placeholder="0.00" value={svc.rate} onChange={(e) => setServiceField(idx, "rate", e.target.value)} className="text-sm" />
                      </div>
                      {!isProject && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">{isRetainer ? "Hours/Month" : "Max Hours/Month"}</label>
                          <Input type="number" placeholder="0" value={svc.hours_per_month} onChange={(e) => setServiceField(idx, "hours_per_month", e.target.value)} className="text-sm" />
                        </div>
                      )}
                      {isProject && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Total Est. Hours</label>
                          <Input type="number" placeholder="0" value={svc.total_estimated_hours} onChange={(e) => setServiceField(idx, "total_estimated_hours", e.target.value)} className="text-sm" />
                        </div>
                      )}
                      {isRetainer && (
                        <div className="col-span-2">
                          <label className="text-xs text-slate-500 mb-1 block">Overage Rate ($/hr)</label>
                          <Input type="number" placeholder="0.00" value={svc.overage_rate} onChange={(e) => setServiceField(idx, "overage_rate", e.target.value)} className="text-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={closeForm}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isPending} style={{ backgroundColor: "hsl(217, 91%, 60%)" }} className="text-white hover:opacity-90">
              {editingDeal ? "Save Changes" : "Save Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDealMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isOpen && (
        <CardContent className="p-0">
          {deals.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6 px-4">No deals yet</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {deals.map((deal) => (
                <div key={deal.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900">{deal.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{moment(deal.created_date).format("MMM D, YYYY")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(deal)} className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600 flex-shrink-0">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(deal)} className="h-6 w-6 p-0 text-red-600 hover:text-red-700 flex-shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {deal.value && (
                      <Badge variant="outline" className="text-xs">${deal.value.toLocaleString()}</Badge>
                    )}
                    <Badge className="text-xs" style={{ backgroundColor: "hsl(214, 95%, 93%)", color: "hsl(217, 91%, 60%)" }}>
                      {getStageLabel(deal.stage)}
                    </Badge>
                    {deal.contract_type && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {CONTRACT_TYPES.find(t => t.value === deal.contract_type)?.label || deal.contract_type}
                      </Badge>
                    )}
                    {deal.services?.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {deal.services.length} service{deal.services.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  {deal.start_date && deal.end_date && (
                    <p className="text-xs text-slate-400 mt-1">
                      {moment(deal.start_date).format("MMM D, YYYY")} – {moment(deal.end_date).format("MMM D, YYYY")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}