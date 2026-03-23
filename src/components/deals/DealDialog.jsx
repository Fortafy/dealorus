import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

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

/**
 * Unified Deal dialog for creating and editing deals.
 *
 * Props:
 *  - open: boolean
 *  - onOpenChange: (open: boolean) => void
 *  - deal: existing deal object (null/undefined for create mode)
 *  - lifecycleStages: array of { id, name, order }
 *  - organizations: array of org objects (optional — hide org picker if not provided)
 *  - onSubmit: (formPayload, dealId?) => void  — called with the built payload
 *  - isPending: boolean
 */
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

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setServiceField = (index, key, val) => setForm((f) => {
    const services = [...f.services];
    services[index] = { ...services[index], [key]: val };
    return { ...f, services };
  });
  const addService = () => setForm((f) => ({ ...f, services: [...f.services, emptyService()] }));
  const removeService = (index) => setForm((f) => ({ ...f, services: f.services.filter((_, i) => i !== index) }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.stage) {
      toast.error("Please fill in deal name and stage");
      return;
    }
    if (organizations && !isEdit && !form.organization_id) {
      toast.error("Please select an organization");
      return;
    }
    const services = form.services
      .filter((s) => s.service_name)
      .map((s) => ({
        service_name: s.service_name,
        ...(s.hours_per_month !== "" && { hours_per_month: parseFloat(s.hours_per_month) }),
        ...(s.total_estimated_hours !== "" && { total_estimated_hours: parseFloat(s.total_estimated_hours) }),
        ...(s.rate !== "" && { rate: parseFloat(s.rate) }),
        ...(s.overage_rate !== "" && { overage_rate: parseFloat(s.overage_rate) }),
      }));
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
      services,
    };
    onSubmit(payload, deal?.id);
  };

  const isProject = form.contract_type === "project";
  const isRetainer = form.contract_type === "monthly_retainer";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Deal" : "New Deal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Deal Name *</label>
              <Input placeholder="Deal name..." value={form.name} onChange={(e) => setField("name", e.target.value)} className="text-sm" />
            </div>

            {organizations && (
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Organization *</label>
                <select value={form.organization_id} onChange={(e) => setField("organization_id", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
                  <option value="">Select organization...</option>
                  {organizations.map((o) => <option key={o.id} value={o.id}>{o.organization_name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Stage *</label>
              <select value={form.stage} onChange={(e) => setField("stage", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
                <option value="">{isLoadingFallbackStages ? "Loading stages..." : "Select stage..."}</option>
                {stageOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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

        <DialogFooter className="flex items-center gap-2">
          <div className="flex-1">
            <ReminderPickerField value={form.remind_at} onChange={(val) => setField("remind_at", val)} />
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