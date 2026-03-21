import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, CalendarDays, X } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReminderPicker from "@/components/reminders/ReminderPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

function InlineReminderBadge({ value, isPastDue, onSave }) {
  const [open, setOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const at9am = (date) => {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const handleQuick = (date) => {
    onSave(at9am(date).toISOString());
    setOpen(false);
  };

  const handleCalendarSelect = (date) => {
    if (!date) return;
    onSave(at9am(date).toISOString());
    setCalendarOpen(false);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSave(null);
  };

  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

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
          <button
            type="button"
            onClick={() => handleQuick(today)}
            className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleQuick(tomorrow)}
            className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Tomorrow
          </button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="border border-slate-300 rounded-full p-1.5 bg-white hover:bg-slate-50 transition-colors text-slate-700"
                title="Pick a date"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                onSelect={handleCalendarSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function NotesSection({ organization, clientId, externalOpenCreate }) {
  const queryClient = useQueryClient();
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => {
    if (externalOpenCreate > 0) openCreate();
  }, [externalOpenCreate]);
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [reminderDate, setReminderDate] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", organization.id],
    queryFn: () => base44.entities.Note.filter({ organization_id: organization.id }, "-created_date"),
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Note.create({ ...data, client_id: clientId, organization_id: organization.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", organization.id] });
      toast.success("Note created");
      closeForm();
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", organization.id] });
      toast.success("Note updated");
      closeForm();
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

  const openCreate = () => {
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setReminderDate(null);
    setShowNoteForm(true);
  };

  const openEdit = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setReminderDate(note.remind_at || null);
    setShowNoteForm(true);
  };

  const closeForm = () => {
    setShowNoteForm(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setReminderDate(null);
  };

  const handleSubmit = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }
    if (editingNote) {
      updateNoteMutation.mutate({ id: editingNote.id, data: { title: noteTitle, content: noteContent, remind_at: reminderDate || null } });
    } else {
      createNoteMutation.mutate({ title: noteTitle, content: noteContent, remind_at: reminderDate || null });
    }
  };

  const isPending = createNoteMutation.isPending || updateNoteMutation.isPending;

  return (
    <div className="border-b border-slate-200 overflow-hidden">
      <div className="py-2 px-4 bg-slate-50 border-b border-slate-200">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 group hover:opacity-80 transition-opacity">
              <span className="text-sm font-semibold text-slate-700">Notes ({notes.length})</span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </CollapsibleTrigger>
            <Button size="sm" onClick={openCreate} style={{ backgroundColor: "hsl(217, 91%, 60%)" }} className="text-white hover:opacity-90 h-7 px-2">
              <Plus className="w-3 h-3 mr-1" />
              Add Note
            </Button>
          </div>
        </Collapsible>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showNoteForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "Add Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Note title..." value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="text-sm" />
            <Textarea placeholder="Write your note here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="text-sm h-32" />
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Reminder:</span>
              <ReminderPicker value={reminderDate} onChange={setReminderDate} />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={closeForm}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isPending} style={{ backgroundColor: "hsl(217, 91%, 60%)" }} className="text-white hover:opacity-90">
              {editingNote ? "Save Changes" : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNoteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isOpen && (
        <div className="p-0">
          {notes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No notes yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {notes.map((note) => (
                <div key={note.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-slate-900">{note.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-500">{moment(note.created_date).format("MMM D, YYYY h:mm A")}</p>
                        {note.remind_at && (() => {
                          const isPastDue = new Date(note.remind_at) < new Date();
                          return (
                            <InlineReminderBadge
                              value={note.remind_at}
                              isPastDue={isPastDue}
                              onSave={(newVal) => updateNoteMutation.mutate({ id: note.id, data: { remind_at: newVal } })}
                            />
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(note)} className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(note)} className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mt-1 line-clamp-2">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}