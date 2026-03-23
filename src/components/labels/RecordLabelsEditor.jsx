import React, { useMemo } from "react";
import { Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LabelBadge from "@/components/labels/LabelBadge";

export default function RecordLabelsEditor({ labels = [], selectedIds = [], onChange, className = "" }) {
  const selectedLabels = useMemo(
    () => labels.filter((label) => (selectedIds || []).includes(label.id)),
    [labels, selectedIds]
  );

  const toggleLabel = (labelId) => {
    const currentIds = Array.isArray(selectedIds) ? selectedIds : [];
    const nextIds = currentIds.includes(labelId)
      ? currentIds.filter((id) => id !== labelId)
      : [...currentIds, labelId];

    onChange(nextIds);
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {selectedLabels.map((label) => (
        <LabelBadge
          key={label.id}
          label={label}
          removable
          onRemove={() => toggleLabel(label.id)}
        />
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs">
            <Tag className="h-3 w-3" />
            Labels
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          {labels.length === 0 ? (
            <p className="px-2 py-3 text-xs text-slate-500">No labels have been created yet.</p>
          ) : (
            <div className="space-y-1">
              {labels.map((label) => {
                const isSelected = (selectedIds || []).includes(label.id);

                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <LabelBadge label={label} className="pointer-events-none" />
                    <Check className={`h-3.5 w-3.5 ${isSelected ? "text-slate-900" : "text-transparent"}`} />
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}