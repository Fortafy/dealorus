import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import ActivityRecordModifiedCard from "@/components/activity/ActivityRecordModifiedCard";
import DealDialog from "@/components/deals/DealDialog";
import NoteDialog from "@/components/notes/NoteDialog";
import { MoreHorizontal, Pencil, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import {
  formatActivityTimelineDate,
  getActivityTimelineAccentClass,
  getActivityTimelineAppearance,
  getActivityTimelineNodeClass,
} from "@/lib/activityTimelineTheme";

const TYPE_OPTIONS = [
  { value: "note", label: "Notes" },
  { value: "deal", label: "Deals" },
  { value: "email", label: "Emails" },
  { value: "call", label: "Calls" },
  { value: "meeting", label: "Meetings" },
];

const stripHtml = (value) => value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";

export default function ActivityTimeline({ organization, lifecycleStages = [] }) {
  const queryClient = useQueryClient();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [showFromCal, setShowFromCal] = useState(false);
  const [showToCal, setShowToCal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editingDeal, setEditingDeal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions", organization.id],
    queryFn: () => base44.entities.Interaction.filter({ organization_id: organization.id }, "-created_date"),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", organization.id],
    queryFn: () => base44.entities.Note.filter({ organization_id: organization.id }, "-created_date"),
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", organization.id],
    queryFn: () => base44.entities.Deal.filter({ organization_id: organization.id }, "-created_date"),
  });

  const mergedActivity = [
    ...(organization.created_date
      ? [{ id: `organization-created-${organization.id}`, type: "created", timestamp: organization.created_date }]
      : []),
    ...interactions.map((interaction) => ({
      ...interaction,
      type: "interaction",
      interactionType: interaction.type,
      timestamp: interaction.created_date,
    })),
    ...notes.map((note) => ({
      ...note,
      type: "note",
      timestamp: note.created_date,
    })),
    ...deals.map((deal) => ({
      ...deal,
      type: "deal",
      timestamp: deal.created_date,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filteredActivity = mergedActivity.filter((item) => {
    if (selectedTypes.length > 0) {
      const itemType = item.type === "interaction" ? item.interactionType : item.type;
      if (!selectedTypes.includes(itemType)) return false;
    }

    if (dateFrom && new Date(item.timestamp) < dateFrom) return false;
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (new Date(item.timestamp) > endOfDay) return false;
    }

    return true;
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", organization.id] });
      toast.success("Note updated");
      setEditingNote(null);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", organization.id] });
      toast.success("Note deleted");
      setDeleteTarget(null);
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal updated");
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

  const hasActiveFilters = selectedTypes.length > 0 || dateFrom || dateTo;

  const clearFilters = () => {
    setSelectedTypes([]);
    setDateFrom(null);
    setDateTo(null);
  };

  const toggleType = (value) => {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((type) => type !== value) : [...prev, value]
    );
  };

  const handleNoteSubmit = (payload, noteId) => {
    updateNoteMutation.mutate({ id: noteId, data: payload });
  };

  const handleDealSubmit = (payload, dealId) => {
    updateDealMutation.mutate({ id: dealId, data: { ...payload, is_active: true } });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "note") {
      deleteNoteMutation.mutate(deleteTarget.id);
      return;
    }
    deleteDealMutation.mutate(deleteTarget.id);
  };

  return (
    <div>
      <NoteDialog
        open={!!editingNote}
        onOpenChange={(open) => { if (!open) setEditingNote(null); }}
        note={editingNote}
        onSubmit={handleNoteSubmit}
        isPending={updateNoteMutation.isPending}
      />

      <DealDialog
        open={!!editingDeal}
        onOpenChange={(open) => { if (!open) setEditingDeal(null); }}
        deal={editingDeal}
        lifecycleStages={lifecycleStages}
        onSubmit={handleDealSubmit}
        isPending={updateDealMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "deal" ? "Deal" : "Note"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.label}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-700">
          Activity Timeline ({filteredActivity.length}{hasActiveFilters ? ` of ${mergedActivity.length}` : ""})
        </span>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-slate-500 hover:text-red-500" onClick={clearFilters}>
              <X className="w-3 h-3" />
            </Button>
          )}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant={hasActiveFilters ? "default" : "outline"} className="h-6 gap-1 px-2 text-xs">
                <SlidersHorizontal className="w-3 h-3" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <p className="mb-2 text-xs font-semibold text-slate-700">Filter by Type</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => toggleType(option.value)}
                    className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                      selectedTypes.includes(option.value)
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-xs font-semibold text-slate-700">Filter by Date Range</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="mb-1 text-[10px] text-slate-500">From</p>
                  <Popover open={showFromCal} onOpenChange={setShowFromCal}>
                    <PopoverTrigger asChild>
                      <button className="w-full rounded border border-slate-200 px-2 py-1 text-left text-xs text-slate-700 transition-colors hover:border-slate-400">
                        {dateFrom ? moment(dateFrom).format("MMM D, YYYY") : "Any"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => {
                          setDateFrom(date);
                          setShowFromCal(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1">
                  <p className="mb-1 text-[10px] text-slate-500">To</p>
                  <Popover open={showToCal} onOpenChange={setShowToCal}>
                    <PopoverTrigger asChild>
                      <button className="w-full rounded border border-slate-200 px-2 py-1 text-left text-xs text-slate-700 transition-colors hover:border-slate-400">
                        {dateTo ? moment(dateTo).format("MMM D, YYYY") : "Any"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => {
                          setDateTo(date);
                          setShowToCal(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 w-full text-center text-xs text-slate-500 transition-colors hover:text-red-500">
                  Clear all filters
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="px-4 py-3">
        {filteredActivity.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {hasActiveFilters ? "No activity matches your filters" : "No activity yet"}
          </p>
        ) : (
          <div className="activity-timeline-track">
            <div className="activity-timeline-line" />

            <div className="activity-timeline-list">
              {filteredActivity.map((item) => {
                const appearanceKey = item.type === "interaction" ? item.interactionType || "interaction" : item.type;
                const appearance = getActivityTimelineAppearance(appearanceKey);
                const Icon = appearance.icon;

                return (
                  <div key={`${item.type}-${item.id}`} className="activity-timeline-item">
                    <div className={getActivityTimelineNodeClass(appearanceKey)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    {item.type === "edit" ? (
                      <ActivityRecordModifiedCard item={{ ...item, itemType: "edit" }} />
                    ) : (
                      <div className="activity-timeline-card">
                        <div className="activity-timeline-card-header">
                          <p className="activity-timeline-card-title">
                            {item.type === "note"
                              ? item.title
                              : item.type === "deal"
                                ? item.name
                                : item.type === "created"
                                  ? "Organization Created"
                                  : item.subject}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="activity-timeline-card-timestamp">
                              {formatActivityTimelineDate(item.timestamp)}
                            </span>
                            {item.type === "note" || item.type === "deal" ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="rounded-sm p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem onSelect={() => item.type === "note" ? setEditingNote(item) : setEditingDeal(item)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => setDeleteTarget({
                                      id: item.id,
                                      type: item.type,
                                      label: item.type === "note" ? item.title : item.name,
                                    })}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </div>
                        </div>

                        {item.type === "note" && stripHtml(item.content) ? (
                          <div className="activity-timeline-detail-box">{stripHtml(item.content)}</div>
                        ) : null}

                        {item.type === "deal" ? (
                          <div className="activity-timeline-pills">
                            {item.stage ? (
                              <span className="activity-timeline-pill">
                                Stage: {lifecycleStages.find((stage) => stage.id === item.stage)?.name || item.stage}
                              </span>
                            ) : null}
                            {item.value ? (
                              <span className={`activity-timeline-pill ${getActivityTimelineAccentClass(appearanceKey)}`}>
                                ${item.value.toLocaleString()}
                              </span>
                            ) : null}
                            {item.expected_close_date ? (
                              <span className="activity-timeline-pill">Close: {moment(item.expected_close_date).format("MMM D, YYYY")}</span>
                            ) : null}
                          </div>
                        ) : null}

                        {item.type === "interaction" ? (
                          <div className="activity-timeline-card-body">
                            <div className="activity-timeline-detail-box">
                              <span className="activity-timeline-detail-label">Type:</span>{" "}
                              <span className={getActivityTimelineAccentClass(appearanceKey)}>
                                {item.interactionType?.charAt(0).toUpperCase() + item.interactionType?.slice(1)}
                              </span>
                              {item.description ? <div className="mt-1 text-slate-600">{item.description}</div> : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}