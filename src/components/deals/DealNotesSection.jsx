import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, CalendarDays, X } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import NoteDialog from "@/components/notes/NoteDialog";

function InlineReminderBadge({ value, isPastDue, onSave }) {
  const [open, setOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const at9am = (date) => {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className={`inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5 font-medium cursor-pointer transition-colors ${
          isPastDue ? "border-red-300 text-red-600 bg-white hover:bg-red-50" : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
        }`}>
          <CalendarDays className={`w-3 h-3 ${isPastDue ? "text-red-500" : "text-slate-500"}`} />
          {moment(value).format("MMM D, h:mm A")}
          <button type="button" onClick={(e) => { e.stopPropagation(); onSave(null); }} className={`ml-0.5 ${isPastDue ? "text-red-400 hover:text-red-700" : "text-slate-400 hover:text-slate-700"}`}>
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Change reminder</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { onSave(at9am(today).toISOString()); setOpen(false); }} className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">Today</button>
          <button type="button" onClick={() => { onSave(at9am(tomorrow).toISOString()); setOpen(false); }} className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">Tomorrow</button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="border border-slate-300 rounded-full p-1.5 bg-white hover:bg-slate-50 transition-colors text-slate-700">
                <CalendarDays className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                onSelect={(date) => {
                  if (!date) return;
                  onSave(at9am(date).toISOString());
                  setCalendarOpen(false);
                  setOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function DealNotesSection({ deal, clientId, externalOpenCreate = 0 }) {
  const queryClient = useQueryClient();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  React.useEffect(() => {
    if (externalOpenCreate > 0) {
      setEditingNote(null);
      setShowNoteForm(true);
    }
  }, [externalOpenCreate]);

  const { data: notes = [] } = useQuery({
    queryKey: ["deal-notes", deal?.id],
    enabled: !!deal?.id,
    queryFn: () => base44.entities.Note.filter({ organization_id: deal.organization_id, contact_id: deal.id }, "-created_date"),
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create({ ...data, client_id: clientId, organization_id: deal.organization_id, contact_id: deal.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-notes", deal.id] });
      toast.success("Note created");
      setShowNoteForm(false);
      setEditingNote(null);
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-notes", deal.id] });
      toast.success("Note updated");
      setShowNoteForm(false);
      setEditingNote(null);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-notes", deal.id] });
      toast.success("Note deleted");
      setDeleteTarget(null);
    },
  });

  const isPending = createNoteMutation.isPending || updateNoteMutation.isPending;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="group flex flex-1 items-center gap-2 transition-opacity hover:opacity-80">
              <span className="text-xs font-semibold text-slate-700">Notes ({notes.length})</span>
              {isOpen ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
            </CollapsibleTrigger>
            <Button size="sm" onClick={() => { setEditingNote(null); setShowNoteForm(true); }} className="h-7 px-2 text-xs">
              <Plus className="mr-1 h-3 w-3" />
              Add Note
            </Button>
          </div>
        </Collapsible>
      </div>

      <NoteDialog
        open={showNoteForm}
        onOpenChange={(open) => { if (!open) { setShowNoteForm(false); setEditingNote(null); } }}
        note={editingNote}
        onSubmit={(payload, noteId) => {
          if (noteId) updateNoteMutation.mutate({ id: noteId, data: payload });
          else createNoteMutation.mutate(payload);
        }}
        isPending={isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteNoteMutation.mutate(deleteTarget.id)} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isOpen && (
        <div>
          {notes.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No notes yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {notes.map((note) => (
                <div key={note.id} className="px-4 py-3 transition-colors hover:bg-slate-50">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold text-slate-900">{note.title}</h4>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-[10px] text-slate-500">{moment(note.created_date).format("MMM D, YYYY h:mm A")}</p>
                        {note.remind_at ? (
                          <InlineReminderBadge
                            value={note.remind_at}
                            isPastDue={new Date(note.remind_at) < new Date()}
                            onSave={(newVal) => updateNoteMutation.mutate({ id: note.id, data: { remind_at: newVal } })}
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingNote(note); setShowNoteForm(true); }} className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(note)} className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-700 line-clamp-3">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}