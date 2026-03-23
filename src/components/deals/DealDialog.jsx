import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import DealRichTextEditor from "@/components/deals/DealRichTextEditor";
import DealProposalPdfActions from "@/components/deals/DealProposalPdfActions";

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
  name: "", stage: "", organization_id: "", contract_type: "",
  start_date: "", end_date: "", expected_close_date: "",
  value: "", description: "", remind_at: null, services: [emptyService()],
});

const dealToForm = (deal) => ({
  name: deal.name || "",
  stage: deal.stage || "",
  organization_id: deal.organization_id || "",
  contract_type: deal.contract_type || "",
  start_date: deal.start_date || "",
  end_date: deal.end_date || "",
  expected_close_date: deal.expected_close_date || "",
  value: deal.value != null ? String(deal.value) : "",
  description: deal.description || "",
  remind_at: deal.remind_at || null,
  services: deal.services?.length
    ? deal.services.map((s) => ({
        service_name: s.service_name || "",
        hours_per_month: s.hours_per_month != null ? String(s.hours_per_month) : "",
        total_estimated_hours: s.total_estimated_hours != null ? String(s.total_estimated_hours) : "",
        rate: s.rate != null ? String(s.rate) : "",
        overage_rate: s.overage_rate != null ? String(s.overage_rate) : "",
      }))
    : [emptyService()],
});

const parseServices = (services) => {
  return services
    .filter((service) => service.service_name)
    .map((service) => ({
      service_name: service.service_name,
      ...(service.hours_per_month !== "" && { hours_per_month: parseFloat(service.hours_per_month) }),
      ...(service.total_estimated_hours !== "" && { total_estimated_hours: parseFloat(service.total_estimated_hours) }),
      ...(service.rate !== "" && { rate: parseFloat(service.rate) }),
      ...(service.overage_rate !== "" && { overage_rate: parseFloat(service.overage_rate) }),
    }));
};

function ReminderPickerField({ value, onChange }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const at9am = (date) => { const d = new Date(date); d.setHours(9, 0, 0, 0); return d; };
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const isPastDue = value && new Date(value) < new Date();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {value ? (
        <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 bg-white text-sm font-medium ${isPastDue ? "border-red-300 text-red-600" : "border-slate-300 text-slate-700"}`}>
          <CalendarDays className={`w-3.5 h-3.5 ${isPastDue ? "text-red-500" : "text-slate-500"}`} />
          <span>{moment(value).format("MMM D, YYYY")}</span>
          <button type="button" onClick={() => onChange(null)} className={`ml-1 ${isPastDue ? "text-red-400 hover:text-red-700" : "text-slate-400 hover:text-slate-700"}`}>
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => onChange(at9am(today).toISOString())} className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">Today</button>
          <button type="button" onClick={() => onChange(at9am(tomorrow).toISOString())} className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">Tomorrow</button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="border border-slate-300 rounded-full p-1.5 bg-white hover:bg-slate-50 transition-colors text-slate-700">
                <CalendarDays className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" onSelect={(date) => { if (date) { onChange(at9am(date).toISOString()); setCalendarOpen(false); } }} initialFocus />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}

export default function DealDialog({ open, onOpenChange, deal, lifecycleStages = [], organizations, onSubmit, isPending, clientId }) {
  const isEdit = !!deal;
  const [form, setForm] = useState(emptyForm());
  const resolvedClientId = clientId || deal?.client_id || null;

  const { data: fallbackClient, isLoading: isLoadingFallbackStages } = useQuery({
    queryKey: ["deal-dialog-client-stages", resolvedClientId],
    enabled: open && !!resolvedClientId && lifecycleStages.length === 0,
    queryFn: async () => {
      const results = await base44.entities.Client.filter({ id: resolvedClientId });
      return results[0] || null;
    }
  });

  const stageOptions = React.useMemo(() => {
    const stages = lifecycleStages.length ? lifecycleStages : fallbackClient?.lifecycle_stages || [];
    return [...stages].sort((a, b) => a.order - b.order);
  }, [lifecycleStages, fallbackClient]);

  useEffect(() => {
    if (open) {
      setForm(deal ? dealToForm(deal) : emptyForm());
    }
  }, [open, deal]);

  const setField = (key, val) => setForm((currentForm) => ({ ...currentForm, [key]: val }));
  const setServiceField = (index, key, val) => setForm((currentForm) => {
    const services = [...currentForm.services];
    services[index] = { ...services[index], [key]: val };
    return { ...currentForm, services };
  });
  const addService = () => setForm((currentForm) => ({ ...currentForm, services: [...currentForm.services, emptyService()] }));
  const removeService = (index) => setForm((currentForm) => ({ ...currentForm, services: currentForm.services.filter((_, i) => i !== index) }));

  const previewDeal = React.useMemo(() => {
    if (!deal) return null;

    const selectedOrganizationName = organizations?.find((organization) => organization.id === form.organization_id)?.organization_name;

    return {
      ...deal,
      name: form.name,
      stage: form.stage,
      organization_id: form.organization_id || deal.organization_id,
      organization_name: deal.organization_name || selectedOrganizationName || "",
      contract_type: form.contract_type || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      expected_close_date: form.expected_close_date || null,
      value: form.value ? parseFloat(form.value) : null,
      description: form.description || null,
      remind_at: form.remind_at || null,
      services: parseServices(form.services),
    };
  }, [deal, form, organizations]);

  const handleSubmit = () => {
    if (!form.name.trim() || !form.stage) {
      toast.error("Please fill in deal name and stage");
      return;
    }
    if (organizations && !isEdit && !form.organization_id) {
      toast.error("Please select an organization");
      return;
    }

    const payload = {
      name: form.name,
      stage: form.stage,
      organization_id: form.organization_id || deal?.organization_id,
      contract_type: form.contract_type || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      expected_close_date: form.expected_close_date || null,
      value: form.value ? parseFloat(form.value) : null,
      description: form.description || null,
      remind_at: form.remind_at || null,
      services: parseServices(form.services),
    };

    onSubmit(payload, deal?.id);
  };

  const isProject = form.contract_type === "project";
  const isRetainer = form.contract_type === "monthly_retainer";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onOpenChange(false); }}>
      <DialogContent className="flex h-[calc(100vh-2rem)] max-h-[820px] w-[calc(100vw-2rem)] max-w-[675px] flex-col overflow-hidden sm:h-[820px] sm:max-w-[675px]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEdit ? "Edit Deal" : "New Deal"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 pr-1">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Deal Name *</label>
                <Input placeholder="Deal name..." value={form.name} onChange={(e) => setField("name", e.target.value)} className="text-sm" />
              </div>

              {organizations && (
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">Organization *</label>
                  <select value={form.organization_id} onChange={(e) => setField("organization_id", e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
                    <option value="">Select organization...</option>
                    {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.organization_name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-slate-500">Stage *</label>
                <select value={form.stage} onChange={(e) => setField("stage", e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
                  <option value="">{isLoadingFallbackStages ? "Loading stages..." : "Select stage..."}</option>
                  {stageOptions.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Contract Type</label>
                <select value={form.contract_type} onChange={(e) => setField("contract_type", e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
                  <option value="">Select type...</option>
                  {CONTRACT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Start Date</label>
                <Input type="date" value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">End Date</label>
                <Input type="date" value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Expected Close Date</label>
                <Input type="date" value={form.expected_close_date} onChange={(e) => setField("expected_close_date", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Deal Value ($)</label>
                <Input type="number" placeholder="0.00" value={form.value} onChange={(e) => setField("value", e.target.value)} className="text-sm" />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Notes</label>
                <DealRichTextEditor value={form.description} onChange={(value) => setField("description", value)} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Services</p>
                <Button size="sm" variant="outline" onClick={addService} className="h-6 px-2 text-xs">
                  <Plus className="mr-1 h-3 w-3" /> Add Service
                </Button>
              </div>
              <div className="space-y-3">
                {form.services.map((service, index) => (
                  <div key={index} className="relative rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {form.services.length > 1 && (
                      <button onClick={() => removeService(index)} className="absolute right-2 top-2 text-slate-400 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs text-slate-500">Service</label>
                        <select value={service.service_name} onChange={(e) => setServiceField(index, "service_name", e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
                          <option value="">Select service...</option>
                          {SERVICE_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Hourly Rate ($)</label>
                        <Input type="number" placeholder="0.00" value={service.rate} onChange={(e) => setServiceField(index, "rate", e.target.value)} className="text-sm" />
                      </div>
                      {!isProject && (
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">{isRetainer ? "Hours/Month" : "Max Hours/Month"}</label>
                          <Input type="number" placeholder="0" value={service.hours_per_month} onChange={(e) => setServiceField(index, "hours_per_month", e.target.value)} className="text-sm" />
                        </div>
                      )}
                      {isProject && (
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Total Est. Hours</label>
                          <Input type="number" placeholder="0" value={service.total_estimated_hours} onChange={(e) => setServiceField(index, "total_estimated_hours", e.target.value)} className="text-sm" />
                        </div>
                      )}
                      {isRetainer && (
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs text-slate-500">Overage Rate ($/hr)</label>
                          <Input type="number" placeholder="0.00" value={service.overage_rate} onChange={(e) => setServiceField(index, "overage_rate", e.target.value)} className="text-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isEdit && previewDeal && (
              <DealProposalPdfActions
                deal={previewDeal}
                lifecycleStages={stageOptions}
                variant="section"
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-shrink-0 items-center gap-2 border-t pt-4">
          <div className="flex-1">
            <ReminderPickerField value={form.remind_at} onChange={(value) => setField("remind_at", value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} style={{ backgroundColor: "hsl(217, 91%, 60%)" }} className="text-white hover:opacity-90">
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}