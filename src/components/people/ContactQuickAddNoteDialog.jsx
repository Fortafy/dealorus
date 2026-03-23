import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReminderPicker from "@/components/reminders/ReminderPicker";

export default function ContactQuickAddNoteDialog({ open, onOpenChange, organization, clientId }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [remindAt, setRemindAt] = useState(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
      setRemindAt(null);
    }
  }, [open]);

  const createNoteMutation = useMutation({
    mutationFn: () => base44.entities.Note.create({
      client_id: clientId,
      organization_id: organization.id,
      title,
      content,
      remind_at: remindAt || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", organization.id] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input placeholder="Note title..." value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm" />
          <Textarea placeholder="Write your note here..." value={content} onChange={(e) => setContent(e.target.value)} className="h-32 text-sm" />
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Reminder:</span>
            <ReminderPicker value={remindAt} onChange={setRemindAt} />
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={() => createNoteMutation.mutate()} disabled={createNoteMutation.isPending || !title.trim() || !content.trim()}>
            {createNoteMutation.isPending ? "Saving..." : "Save Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}