import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Building2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import DealEditorDialog from "@/components/deals/DealEditorDialog";

const CONTRACT_TYPES = [
  { value: "monthly_retainer", label: "Monthly Retainer" },
  { value: "ad_hoc", label: "Ad Hoc" },
  { value: "project", label: "Project" },
];

export default function KanbanDealCard({ deal, isDragging, lifecycleStages, onUpdate }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const queryClient = useQueryClient();


  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Deal.delete(deal.id),
    onSuccess: () => {
      toast.success("Deal deleted");
      setShowDelete(false);
      onUpdate?.();
    },
  });

  const handleEdit = () => setShowEdit(true);

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
      <DealEditorDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        deal={deal}
        clientId={deal.client_id}
        lifecycleStages={lifecycleStages}
        onSaved={onUpdate}
      />

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