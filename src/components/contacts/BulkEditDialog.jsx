import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function BulkEditDialog({ open, onOpenChange, selectedCount, onApply }) {
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply({
        role_department: department || undefined,
        notes: notes || undefined
      });
      setDepartment("");
      setNotes("");
      onOpenChange(false);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedCount} Contacts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Department (optional)
            </label>
            <Input
              placeholder="e.g., Development, Programs, Executive"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Notes (optional)
            </label>
            <Textarea
              placeholder="Add notes to all selected contacts..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 text-sm"
            />
          </div>

          <p className="text-xs text-slate-500">
            Leave fields empty to skip updating them.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isApplying || (!department && !notes)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isApplying ? "Applying..." : "Apply Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}