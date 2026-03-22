import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CONTRACT_TYPES = [
  { value: "monthly_retainer", label: "Monthly Retainer" },
  { value: "ad_hoc", label: "Ad Hoc" },
  { value: "project", label: "Project" },
];

const emptyForm = () => ({
  name: "", stage: "", organization_id: "", contract_type: "",
  value: "", expected_close_date: "", start_date: "", end_date: "", description: "",
});

export default function NewDealDialog({ open, onOpenChange, currentUser, organizations = [], lifecycleStages = [], onSaved }) {
  const [form, setForm] = useState(emptyForm());

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Deal.create(data),
    onSuccess: () => {
      toast.success("Deal created");
      setForm(emptyForm());
      onOpenChange(false);
      onSaved?.();
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.stage || !form.organization_id) {
      toast.error("Please fill in name, stage, and organization");
      return;
    }
    const org = organizations.find(o => o.id === form.organization_id);
    createMutation.mutate({
      client_id: currentUser?.data?.client_id,
      organization_id: form.organization_id,
      organization_name: org?.organization_name || "",
      name: form.name,
      stage: form.stage,
      contract_type: form.contract_type || null,
      value: form.value ? parseFloat(form.value) : null,
      expected_close_date: form.expected_close_date || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description || null,
      is_active: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setForm(emptyForm()); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Deal Name *</label>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="e.g. Salesforce Admin Project" className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Organization *</label>
            <select value={form.organization_id} onChange={e => setField("organization_id", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
              <option value="">Select organization...</option>
              {organizations.map(o => <option key={o.id} value={o.id}>{o.organization_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Stage *</label>
              <select value={form.stage} onChange={e => setField("stage", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
                <option value="">Select stage...</option>
                {lifecycleStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Contract Type</label>
              <select value={form.contract_type} onChange={e => setField("contract_type", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
                <option value="">Select type...</option>
                {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Deal Value ($)</label>
              <Input type="number" value={form.value} onChange={e => setField("value", e.target.value)} placeholder="0.00" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Expected Close</label>
              <Input type="date" value={form.expected_close_date} onChange={e => setField("expected_close_date", e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
              <Input type="date" value={form.start_date} onChange={e => setField("start_date", e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">End Date</label>
              <Input type="date" value={form.end_date} onChange={e => setField("end_date", e.target.value)} className="text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Notes</label>
            <Textarea value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Additional notes..." className="text-sm h-16" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending} style={{ backgroundColor: "hsl(217, 91%, 60%)" }} className="text-white hover:opacity-90">
            {createMutation.isPending ? "Creating..." : "Create Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}