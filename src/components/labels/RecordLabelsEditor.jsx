import React, { useMemo } from "react";
import { Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LabelBadge from "@/components/labels/LabelBadge";
import { ALL_LABEL_OBJECTS } from "@/components/labels/LabelObjectScopeSelector";
import { cn } from "@/lib/utils";

const normalizeObjectType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "organization" || normalized === "organizations") return "Organization";
  if (normalized === "contact" || normalized === "contacts") return "Contact";
  if (normalized === "deal" || normalized === "deals") return "Deal";
  return value;
};

export default function RecordLabelsEditor({ labels = [], selectedIds = [], onChange, className = "", objectType, buttonFirst = false, iconOnlyButton = false, triggerVariant = "button", placeholder = "Add Labels" }) {
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

  const availableLabelIds = useMemo(
    () => new Set(availableLabels.map((label) => label.id)),
    [availableLabels]
  );

  const selectedLabels = useMemo(
    () => availableLabels.filter((label) => (selectedIds || []).includes(label.id)),
    [availableLabels, selectedIds]
  );

  const toggleLabel = (labelId) => {
    const currentIds = (Array.isArray(selectedIds) ? selectedIds : []).filter((id) => availableLabelIds.has(id));
    const nextIds = currentIds.includes(labelId)
      ? currentIds.filter((id) => id !== labelId)
      : [...currentIds, labelId];

    onChange(nextIds);
  };

  const triggerButton = (
    <Popover>
      <PopoverTrigger asChild>
        {triggerVariant === "field" ? (
          <button
            type="button"
            className={cn(
              "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50",
              className
            )}
            aria-label="Edit labels"
            title="Click to edit"
          >
            {selectedLabels.length ? (
              selectedLabels.map((label) => (
                <LabelBadge key={label.id} label={label} className="pointer-events-none" />
              ))
            ) : (
              <span className="text-xs text-slate-400">{placeholder}</span>
            )}
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn(iconOnlyButton ? "h-6 w-6 p-0" : "h-6 gap-1 px-2 text-xs", className)}
            aria-label="Edit labels"
          >
            <Tag className="h-3 w-3" />
            {!iconOnlyButton && "Labels"}
          </Button>
        )}
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
  );

  if (triggerVariant === "field") {
    return triggerButton;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {buttonFirst && triggerButton}
      {selectedLabels.map((label) => (
        <LabelBadge
          key={label.id}
          label={label}
          removable
          onRemove={() => toggleLabel(label.id)}
        />
      ))}
      {!buttonFirst && triggerButton}
    </div>
  );
}