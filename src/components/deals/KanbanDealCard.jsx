import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Building2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import DealDialog from "@/components/deals/DealDialog";

const CONTRACT_TYPES = [
  { value: "monthly_retainer", label: "Monthly Retainer" },
  { value: "ad_hoc", label: "Ad Hoc" },
  { value: "project", label: "Project" },
];

export default function KanbanDealCard({ deal, isDragging, lifecycleStages, onUpdate }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({});
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Deal.update(deal.id, data),
    onSuccess: () => {
      toast.success("Deal updated");
      setShowEdit(false);
      onUpdate?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Deal.delete(deal.id),
    onSuccess: () => {
      toast.success("Deal deleted");
      setShowDelete(false);
      onUpdate?.();
    },
  });

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleEdit = () => {
    setForm(dealToForm(deal));
    setShowEdit(true);
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;
    updateMutation.mutate({
      name: form.name,
      stage: form.stage,
      contract_type: form.contract_type || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      expected_close_date: form.expected_close_date || null,
      value: form.value ? parseFloat(form.value) : null,
      description: form.description || null,
    });
  };

  const contractLabel = CONTRACT_TYPES.find(t => t.value === deal.contract_type)?.label;

  return (
    <>
      <div className={`bg-white rounded-lg border p-3 text-xs transition-shadow ${isDragging ? "shadow-lg border-blue-300" : "border-slate-200 shadow-sm hover:shadow-md"}`}>
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <p className="font-semibold text-slate-800 leading-snug flex-1 min-w-0 truncate">{deal.name}</p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={handleEdit} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => setShowDelete(true)} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {deal.organization_name && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{deal.organization_name}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1 mt-1">
          {deal.value > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold text-emerald-700 border-emerald-200 bg-emerald-50">
              ${deal.value.toLocaleString()}
            </Badge>
          )}
          {contractLabel && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
              {contractLabel}
            </Badge>
          )}
        </div>

        {deal.expected_close_date && (
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5">
            <CalendarDays className="w-3 h-3" />
            <span>Close {moment(deal.expected_close_date).format("MMM D, YYYY")}</span>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Deal Name *</label>
              <Input value={form.name || ""} onChange={e => setField("name", e.target.value)} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Stage</label>
                <select value={form.stage || ""} onChange={e => setField("stage", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
                  <option value="">Select...</option>
                  {lifecycleStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Contract Type</label>
                <select value={form.contract_type || ""} onChange={e => setField("contract_type", e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
                  <option value="">Select...</option>
                  {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Deal Value ($)</label>
                <Input type="number" value={form.value || ""} onChange={e => setField("value", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Expected Close</label>
                <Input type="date" value={form.expected_close_date || ""} onChange={e => setField("expected_close_date", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
                <Input type="date" value={form.start_date || ""} onChange={e => setField("start_date", e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">End Date</label>
                <Input type="date" value={form.end_date || ""} onChange={e => setField("end_date", e.target.value)} className="text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <Textarea value={form.description || ""} onChange={e => setField("description", e.target.value)} className="text-sm h-16" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} style={{ backgroundColor: "hsl(217, 91%, 60%)" }} className="text-white hover:opacity-90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deal.name}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}