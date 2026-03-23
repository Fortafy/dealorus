import React from "react";
import { Button } from "@/components/ui/button";

export const LABEL_OBJECT_OPTIONS = [
  { value: "Organization", label: "Organizations" },
  { value: "Contact", label: "Contacts" },
  { value: "Deal", label: "Deals" },
];

export const ALL_LABEL_OBJECTS = LABEL_OBJECT_OPTIONS.map((option) => option.value);

export default function LabelObjectScopeSelector({ value = [], onChange, className = "" }) {
  const selectedValues = Array.isArray(value) ? value : [];

  const toggleValue = (nextValue) => {
    onChange(
      selectedValues.includes(nextValue)
        ? selectedValues.filter((item) => item !== nextValue)
        : [...selectedValues, nextValue]
    );
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {LABEL_OBJECT_OPTIONS.map((option) => {
        const isSelected = selectedValues.includes(option.value);

        return (
          <Button
            key={option.value}
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => toggleValue(option.value)}
            className="h-8 rounded-full px-3 text-xs"
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}