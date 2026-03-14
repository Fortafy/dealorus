import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function NotesSection({ organization, clientId, isCollapsed }) {
  const queryClient = useQueryClient();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", organization.id],
    queryFn: () => base44.entities.Note.filter({ organization_id: organization.id }, "-created_date"),
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Note.create({
        ...data,
        client_id: clientId,
        organization_id: organization.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", organization.id] });
      toast.success("Note created");
      setNoteTitle("");
      setNoteContent("");
      setShowNoteForm(false);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", organization.id] });
      toast.success("Note deleted");
    },
  });

  const handleSubmit = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    setIsSubmitting(true);
    createNoteMutation.mutate({ title: noteTitle, content: noteContent });
    setIsSubmitting(false);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full group hover:opacity-80 transition-opacity">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes ({notes.length})
            </CardTitle>
            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              {!showNoteForm && (
                <Button
                  size="sm"
                  onClick={() => setShowNoteForm(true)}
                  style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
                  className="text-white hover:opacity-90 h-7 px-2"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Note
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

      {isOpen && <CardContent>
        {showNoteForm && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <Input
              placeholder="Note title..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="Write your note here..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="text-sm h-24"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
                className="text-white hover:opacity-90"
              >
                Save Note
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNoteForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No notes yet</p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-900">{note.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{moment(note.created_date).format("MMM D, YYYY h:mm A")}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-slate-700 mt-2 line-clamp-2">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>}
    </Card>
  );
}