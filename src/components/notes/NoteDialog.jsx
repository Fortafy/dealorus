import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReminderPicker from "@/components/reminders/ReminderPicker";
import { toast } from "sonner";

export default function NoteDialog({ open, onOpenChange, note, onSubmit, isPending }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reminderDate, setReminderDate] = useState(null);

  useEffect(() => {
    if (open) {
      setTitle(note?.title || "");
      setContent(note?.content || "");
      setReminderDate(note?.remind_at || null);
    }
  }, [open, note]);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    onSubmit(
      {
        title,
        content,
        remind_at: reminderDate || null,
      },
      note?.id,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{note ? "Edit Note" : "Add Note"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input placeholder="Note title..." value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm" />
          <Textarea placeholder="Write your note here..." value={content} onChange={(e) => setContent(e.target.value)} className="h-32 text-sm" />
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Reminder:</span>
            <ReminderPicker value={reminderDate} onChange={setReminderDate} />
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} style={{ backgroundColor: "hsl(217, 91%, 60%)" }} className="text-white hover:opacity-90">
            {note ? "Save Changes" : "Save Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}