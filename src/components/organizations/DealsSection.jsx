import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, X, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import moment from "moment";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import DealDialog from "@/components/deals/DealDialog";
import RecordLabelsEditor from "@/components/labels/RecordLabelsEditor";

const CONTRACT_TYPES = [
  { value: "monthly_retainer", label: "Monthly Retainer" },
  { value: "ad_hoc", label: "Ad Hoc" },
  { value: "project", label: "Project" },
];

function InlineDealReminderBadge({ value, onSave }) {
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isPastDue = value && new Date(value) < new Date();

  const at9am = (date) => { const d = new Date(date); d.setHours(9, 0, 0, 0); return d; };
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

  const handleQuick = (date) => { onSave(at9am(date).toISOString()); setOpen(false); };
  const handleCalendarSelect = (date) => { if (!date) return; onSave(at9am(date).toISOString()); setCalendarOpen(false); setOpen(false); };
  const handleClear = (e) => { e.stopPropagation(); onSave(null); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className={`inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5 font-medium cursor-pointer transition-colors ${
          isPastDue ? "border-red-300 text-red-600 bg-white hover:bg-red-50" : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
        }`}>
          <CalendarDays className={`w-3 h-3 ${isPastDue ? "text-red-500" : "text-slate-500"}`} />
          {moment(value).format("MMM D, h:mm A")}
          <button type="button" onClick={handleClear} className={`ml-0.5 ${isPastDue ? "text-red-400 hover:text-red-700" : "text-slate-400 hover:text-slate-700"}`}>
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Change reminder</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleQuick(today)} className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">Today</button>
          <button type="button" onClick={() => handleQuick(tomorrow)} className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">Tomorrow</button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="border border-slate-300 rounded-full p-1.5 bg-white hover:bg-slate-50 transition-colors text-slate-700" title="Pick a date">
                <CalendarDays className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" onSelect={handleCalendarSelect} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </PopoverContent>
    </Popover>
  );
}


export default function DealsSection({ organization, clientId, clientLifecycleStages = [], externalOpenCreate }) {
  const queryClient = useQueryClient();
  const [showDealForm, setShowDealForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (externalOpenCreate > 0) openCreate();
  }, [externalOpenCreate]);

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", organization.id],
    queryFn: () => base44.entities.Deal.filter({ organization_id: organization.id }, "-created_date"),
  });

  const { data: labels = [] } = useQuery({
    queryKey: ["labels", clientId],
    enabled: !!clientId,
    queryFn: () => base44.entities.Label.filter({ client_id: clientId }, "name"),
  });

  const createDealMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Deal.create({ ...data, client_id: clientId, organization_id: organization.id, organization_name: organization.organization_name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal created");
      setShowDealForm(false);
      setEditingDeal(null);
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal updated");
      setShowDealForm(false);
      setEditingDeal(null);
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

  const openCreate = () => { setEditingDeal(null); setShowDealForm(true); };
  const openEdit = (deal) => { setEditingDeal(deal); setShowDealForm(true); };
  const closeForm = () => { setShowDealForm(false); setEditingDeal(null); };

  const handleSubmit = (payload, dealId) => {
    if (dealId) {
      updateDealMutation.mutate({ id: dealId, data: { ...payload, is_active: true } });
    } else {
      createDealMutation.mutate({ ...payload, is_active: true });
    }
  };

  const getStageLabel = (stageId) => clientLifecycleStages.find((s) => s.id === stageId)?.name || stageId;
  const isPending = createDealMutation.isPending || updateDealMutation.isPending;

  const handleDealLabelsChange = async (deal, labelIds) => {
    await base44.entities.Deal.update(deal.id, { label_ids: labelIds });
    queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
  };

  return (
    <div className="border-b border-slate-200 overflow-hidden">
      <div className="py-2 px-4 bg-slate-50 border-b border-slate-200">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 group hover:opacity-80 transition-opacity">
              <span className="text-xs font-semibold text-slate-700">Deals ({deals.length})</span>
              {isOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </CollapsibleTrigger>
            <Button size="sm" onClick={openCreate} className="h-6 px-2 text-xs">
              <Plus className="w-2.5 h-2.5" />
            </Button>
          </div>
        </Collapsible>
      </div>

      {/* Create / Edit Dialog — shared component */}
      <DealDialog
        open={showDealForm}
        onOpenChange={(v) => { if (!v) closeForm(); }}
        deal={editingDeal}
        lifecycleStages={clientLifecycleStages}
        onSubmit={handleSubmit}
        isPending={isPending}
      />

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
        <div className="p-0">
          {deals.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4 px-4">No deals yet</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {deals.map((deal) => (
                <div key={deal.id} className="px-4 py-2 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs text-slate-900">{deal.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{moment(deal.created_date).format("MMM D, YYYY")}</p>
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
                  <RecordLabelsEditor
                    labels={labels}
                    selectedIds={deal.label_ids || []}
                    onChange={(labelIds) => handleDealLabelsChange(deal, labelIds)}
                    className="mt-2"
                  />
                  {deal.start_date && deal.end_date && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {moment(deal.start_date).format("MMM D, YYYY")} – {moment(deal.end_date).format("MMM D, YYYY")}
                    </p>
                  )}
                  {deal.remind_at && (
                    <div className="mt-1.5">
                      <InlineDealReminderBadge
                        value={deal.remind_at}
                        isPastDue={new Date(deal.remind_at) < new Date()}
                        onSave={(val) => updateDealMutation.mutate({ id: deal.id, data: { remind_at: val } })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}