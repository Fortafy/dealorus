import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus, Trash2, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

const emptyService = () => ({
  service_name: "",
  hours_per_month: "",
  total_estimated_hours: "",
  rate: "",
  overage_rate: "",
});

const emptyForm = () => ({
  name: "",
  stage: "",
  contract_type: "",
  start_date: "",
  end_date: "",
  expected_close_date: "",
  value: "",
  description: "",
  services: [emptyService()],
});

export default function DealsSection({ organization, clientId, clientLifecycleStages = [] }) {
  const queryClient = useQueryClient();
  const [showDealForm, setShowDealForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [isOpen, setIsOpen] = useState(true);

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", organization.id],
    queryFn: () => base44.entities.Deal.filter({ organization_id: organization.id }, "-created_date"),
  });

  const createDealMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Deal.create({
        ...data,
        client_id: clientId,
        organization_id: organization.id,
        organization_name: organization.organization_name,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal created");
      setForm(emptyForm());
      setShowDealForm(false);
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: (id) => base44.entities.Deal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal deleted");
    },
  });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setServiceField = (index, key, value) => {
    setForm((f) => {
      const services = [...f.services];
      services[index] = { ...services[index], [key]: value };
      return { ...f, services };
    });
  };

  const addService = () => setForm((f) => ({ ...f, services: [...f.services, emptyService()] }));

  const removeService = (index) =>
    setForm((f) => ({ ...f, services: f.services.filter((_, i) => i !== index) }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.stage) {
      toast.error("Please fill in deal name and stage");
      return;
    }
    // Clean up services — remove empty ones, parse numbers
    const services = form.services
      .filter((s) => s.service_name)
      .map((s) => ({
        service_name: s.service_name,
        ...(s.hours_per_month !== "" && { hours_per_month: parseFloat(s.hours_per_month) }),
        ...(s.total_estimated_hours !== "" && { total_estimated_hours: parseFloat(s.total_estimated_hours) }),
        ...(s.rate !== "" && { rate: parseFloat(s.rate) }),
        ...(s.overage_rate !== "" && { overage_rate: parseFloat(s.overage_rate) }),
      }));

    createDealMutation.mutate({
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
    });
  };

  const getStageLabel = (stageId) =>
    clientLifecycleStages.find((s) => s.id === stageId)?.name || stageId;

  const isProject = form.contract_type === "project";
  const isRetainer = form.contract_type === "monthly_retainer";

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 group hover:opacity-80 transition-opacity">
              <CardTitle className="text-base">
                Deals ({deals.length})
              </CardTitle>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </CollapsibleTrigger>
            {!showDealForm && (
              <Button
                size="sm"
                onClick={() => setShowDealForm(true)}
                style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
                className="text-white hover:opacity-90 h-7 px-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                New Deal
              </Button>
            )}
          </div>
        </Collapsible>
      </CardHeader>

      {isOpen && (
        <CardContent>
          {showDealForm && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <p className="text-sm font-semibold text-slate-700">Deal Details</p>

              {/* Core fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Deal Name *</label>
                  <Input
                    placeholder="Deal name..."
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Stage *</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setField("stage", e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Select stage...</option>
                    {clientLifecycleStages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Contract Type</label>
                  <select
                    value={form.contract_type}
                    onChange={(e) => setField("contract_type", e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Select type...</option>
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setField("start_date", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">End Date</label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setField("end_date", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Expected Close Date</label>
                  <Input
                    type="date"
                    value={form.expected_close_date}
                    onChange={(e) => setField("expected_close_date", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Deal Value ($)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.value}
                    onChange={(e) => setField("value", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    className="text-sm h-16"
                  />
                </div>
              </div>

              {/* Services */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">Services</p>
                  <Button size="sm" variant="outline" onClick={addService} className="h-6 px-2 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Service
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.services.map((svc, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg relative">
                      {form.services.length > 1 && (
                        <button
                          onClick={() => removeService(idx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <label className="text-xs text-slate-500 mb-1 block">Service</label>
                          <select
                            value={svc.service_name}
                            onChange={(e) => setServiceField(idx, "service_name", e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
                          >
                            <option value="">Select service...</option>
                            {SERVICE_NAMES.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Hourly Rate ($)</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={svc.rate}
                            onChange={(e) => setServiceField(idx, "rate", e.target.value)}
                            className="text-sm"
                          />
                        </div>

                        {!isProject && (
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">
                              {isRetainer ? "Hours/Month" : "Max Hours/Month"}
                            </label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={svc.hours_per_month}
                              onChange={(e) => setServiceField(idx, "hours_per_month", e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        )}

                        {isProject && (
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Total Est. Hours</label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={svc.total_estimated_hours}
                              onChange={(e) => setServiceField(idx, "total_estimated_hours", e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        )}

                        {isRetainer && (
                          <div className="col-span-2">
                            <label className="text-xs text-slate-500 mb-1 block">Overage Rate ($/hr)</label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={svc.overage_rate}
                              onChange={(e) => setServiceField(idx, "overage_rate", e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={createDealMutation.isPending}
                  style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
                  className="text-white hover:opacity-90"
                >
                  Save Deal
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowDealForm(false); setForm(emptyForm()); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {deals.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No deals yet</p>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <div key={deal.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900">{deal.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{moment(deal.created_date).format("MMM D, YYYY")}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDealMutation.mutate(deal.id)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
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