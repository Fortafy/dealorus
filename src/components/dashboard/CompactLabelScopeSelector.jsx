import React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const OBJECT_OPTIONS = [
  { value: "Organization", label: "Organizations" },
  { value: "Contact", label: "Contacts" },
  { value: "Deal", label: "Deals" },
];

export const ALL_LABEL_OBJECTS = OBJECT_OPTIONS.map((option) => option.value);

export default function CompactLabelScopeSelector({ value = ALL_LABEL_OBJECTS, onChange, className = "" }) {
  const selectedValues = Array.isArray(value) ? value : ALL_LABEL_OBJECTS;
  const selectedCount = selectedValues.length;

  const toggleObject = (objectValue) => {
    const nextValues = selectedValues.includes(objectValue)
      ? selectedValues.filter((value) => value !== objectValue)
      : [...selectedValues, objectValue];

    onChange(nextValues);
  };

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 w-full justify-between px-3 text-xs font-normal text-slate-600">
            <span>{selectedCount} object{selectedCount === 1 ? "" : "s"} selected</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-2">
          <div className="space-y-1">
            {OBJECT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => toggleObject(option.value)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}