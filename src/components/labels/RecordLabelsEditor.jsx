import React, { useMemo } from "react";
import { Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LabelBadge from "@/components/labels/LabelBadge";
import { ALL_LABEL_OBJECTS } from "@/components/labels/LabelObjectScopeSelector";

const normalizeObjectType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "organization" || normalized === "organizations") return "Organization";
  if (normalized === "contact" || normalized === "contacts") return "Contact";
  if (normalized === "deal" || normalized === "deals") return "Deal";
  return value;
};

export default function RecordLabelsEditor({ labels = [], selectedIds = [], onChange, className = "", objectType }) {
  const normalizedObjectType = normalizeObjectType(objectType);

  const availableLabels = useMemo(
    () => labels.filter((label) => {
      const applicableObjects = (Array.isArray(label.applicable_objects) && label.applicable_objects.length
        ? label.applicable_objects
        : ALL_LABEL_OBJECTS).map(normalizeObjectType);

      return !normalizedObjectType || applicableObjects.includes(normalizedObjectType);
    }),
    [labels, normalizedObjectType]
  );

  const selectedLabels = useMemo(
    () => availableLabels.filter((label) => (selectedIds || []).includes(label.id)),
    [availableLabels, selectedIds]
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
          {availableLabels.length === 0 ? (
            <p className="px-2 py-3 text-xs text-slate-500">No labels are available for this record type.</p>
          ) : (
            <div className="space-y-1">
              {availableLabels.map((label) => {
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