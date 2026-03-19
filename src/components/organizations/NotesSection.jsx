import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReminderPicker from "@/components/reminders/ReminderPicker";

export default function NotesSection({ organization, clientId }) {
  const queryClient = useQueryClient();
  const [showNoteForm, setShowNoteForm] = useState(false);
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
      updateNoteMutation.mutate({ id: editingNote.id, data: { title: noteTitle, content: noteContent } });
    } else {
      createNoteMutation.mutate({ title: noteTitle, content: noteContent });
    }
  };

  const isPending = createNoteMutation.isPending || updateNoteMutation.isPending;

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 group hover:opacity-80 transition-opacity">
              <CardTitle className="text-base">Notes ({notes.length})</CardTitle>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </CollapsibleTrigger>
            <Button size="sm" onClick={openCreate} style={{ backgroundColor: "hsl(217, 91%, 60%)" }} className="text-white hover:opacity-90 h-7 px-2">
              <Plus className="w-3 h-3 mr-1" />
              Add Note
            </Button>
          </div>
        </Collapsible>
      </CardHeader>

      {/* Create / Edit Dialog */}
      <Dialog open={showNoteForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "Add Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Note title..." value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="text-sm" />
            <Textarea placeholder="Write your note here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="text-sm h-32" />
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
        <CardContent className="p-0">
          {notes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No notes yet</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {notes.map((note) => (
                <div key={note.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-slate-900">{note.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{moment(note.created_date).format("MMM D, YYYY h:mm A")}</p>
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
        </CardContent>
      )}
    </Card>
  );
}