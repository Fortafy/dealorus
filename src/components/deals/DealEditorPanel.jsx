import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, CalendarDays, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import DealRichTextEditor from "@/components/deals/DealRichTextEditor";
import DealProposalPdfActions from "@/components/deals/DealProposalPdfActions";
import DealOnboardingSection from "@/components/deals/DealOnboardingSection";
import DealNotesSection from "@/components/deals/DealNotesSection";
import DealActivityFeed from "@/components/deals/DealActivityFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const parseServices = (services) => services.filter((service) => service.service_name).map((service) => ({
  service_name: service.service_name,
  ...(service.hours_per_month !== "" && { hours_per_month: parseFloat(service.hours_per_month) }),
  ...(service.total_estimated_hours !== "" && { total_estimated_hours: parseFloat(service.total_estimated_hours) }),
  ...(service.rate !== "" && { rate: parseFloat(service.rate) }),
  ...(service.overage_rate !== "" && { overage_rate: parseFloat(service.overage_rate) }),
}));

function ReminderPickerField({ value, onChange }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const at9am = (date) => { const d = new Date(date); d.setHours(9, 0, 0, 0); return d; };
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const isPastDue = value && new Date(value) < new Date();

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {value ? (
        <div className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${isPastDue ? "border-red-300 text-red-600" : "border-slate-300 text-slate-700"}`}>
          <CalendarDays className={`h-3 w-3 ${isPastDue ? "text-red-500" : "text-slate-500"}`} />
          <span>{moment(value).format("MMM D, YYYY")}</span>
          <button type="button" onClick={() => onChange(null)} className={`ml-0.5 ${isPastDue ? "text-red-400 hover:text-red-700" : "text-slate-400 hover:text-slate-700"}`}>
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => onChange(at9am(today).toISOString())} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">Today</button>
          <button type="button" onClick={() => onChange(at9am(tomorrow).toISOString())} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">Tomorrow</button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="rounded-full border border-slate-300 bg-white p-1 text-slate-700 transition-colors hover:bg-slate-50">
                <CalendarDays className="h-3.5 w-3.5" />
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

export default function DealEditorPanel({ deal, open, onClose, organizations = [], lifecycleStages = [] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState(emptyForm());
  const [activeTab, setActiveTab] = React.useState("details");

  React.useEffect(() => {
    if (open) {
      setForm(deal ? dealToForm(deal) : emptyForm());
      setActiveTab("details");
    }
  }, [open, deal]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      toast.success("Deal updated");
      queryClient.invalidateQueries({ queryKey: ["deals-board"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const setField = (key, val) => setForm((currentForm) => ({ ...currentForm, [key]: val }));
  const setServiceField = (index, key, val) => setForm((currentForm) => {
    const services = [...currentForm.services];
    services[index] = { ...services[index], [key]: val };
    return { ...currentForm, services };
  });
  const addService = () => setForm((currentForm) => ({ ...currentForm, services: [...currentForm.services, emptyService()] }));
  const removeService = (index) => setForm((currentForm) => ({ ...currentForm, services: currentForm.services.filter((_, i) => i !== index) }));

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === (form.organization_id || deal?.organization_id)),
    [organizations, form.organization_id, deal]
  );

  const previewDeal = useMemo(() => {
    if (!deal) return null;
    return {
      ...deal,
      name: form.name,
      stage: form.stage,
      organization_id: form.organization_id || deal.organization_id,
      organization_name: selectedOrganization?.organization_name || deal.organization_name || "",
      contract_type: form.contract_type || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      expected_close_date: form.expected_close_date || null,
      value: form.value ? parseFloat(form.value) : null,
      description: form.description || null,
      remind_at: form.remind_at || null,
      services: parseServices(form.services),
    };
  }, [deal, form, selectedOrganization]);

  if (!open || !deal) return null;

  const isProject = form.contract_type === "project";
  const isRetainer = form.contract_type === "monthly_retainer";

  const handleSave = () => {
    if (!form.name.trim() || !form.stage) {
      toast.error("Please fill in deal name and stage");
      return;
    }

    updateMutation.mutate({
      id: deal.id,
      data: {
        name: form.name,
        stage: form.stage,
        organization_id: form.organization_id || deal.organization_id,
        organization_name: selectedOrganization?.organization_name || deal.organization_name || "",
        contract_type: form.contract_type || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        expected_close_date: form.expected_close_date || null,
        value: form.value ? parseFloat(form.value) : null,
        description: form.description || null,
        remind_at: form.remind_at || null,
        services: parseServices(form.services),
      },
    });
  };

  return (
    <div className="w-full max-w-[720px] border-l border-slate-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <button onClick={onClose} className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-800">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to deals
            </button>
            <h2 className="truncate text-lg font-semibold text-slate-900">Edit Deal</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>Save Changes</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {selectedOrganization ? (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <Link to={`/Organizations?id=${selectedOrganization.id}`} className="font-medium text-blue-600 hover:underline">
                      {selectedOrganization.organization_name}
                    </Link>
                  </div>
                ) : deal.organization_name ? (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">{deal.organization_name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No organization linked</p>
                )}
              </div>
              <ReminderPickerField value={form.remind_at} onChange={(value) => setField("remind_at", value)} />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
            <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-slate-200 bg-white px-0">
              <TabsTrigger value="details">Detail</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0 space-y-5 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">Deal Name *</label>
                  <Input placeholder="Deal name..." value={form.name} onChange={(e) => setField("name", e.target.value)} className="text-sm" />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-500">Stage *</label>
                  <select value={form.stage} onChange={(e) => setField("stage", e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
                    <option value="">Select stage...</option>
                    {lifecycleStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
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
                  <label className="mb-1 block text-xs text-slate-500">Description</label>
                  <DealRichTextEditor value={form.description} onChange={(value) => setField("description", value)} editorClassName="[&_.ql-editor]:min-h-[90px]" />
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

              {previewDeal ? (
                <div className="space-y-4">
                  <DealProposalPdfActions deal={previewDeal} lifecycleStages={lifecycleStages} variant="section" />
                  <DealOnboardingSection organizationId={previewDeal.organization_id} />
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="notes" className="mt-0 px-5 py-4">
              <DealNotesSection deal={deal} clientId={deal.client_id} />
            </TabsContent>

            <TabsContent value="activity" className="mt-0 px-5 py-4">
              <DealActivityFeed deal={deal} lifecycleStages={lifecycleStages} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}