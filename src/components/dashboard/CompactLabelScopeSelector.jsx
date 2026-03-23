import React from "react";

const OBJECT_OPTIONS = [
  { value: "Organization", label: "Organizations" },
  { value: "Contact", label: "Contacts" },
  { value: "Deal", label: "Deals" },
];

export const ALL_LABEL_OBJECTS = OBJECT_OPTIONS.map((option) => option.value);

export default function CompactLabelScopeSelector({ value = ALL_LABEL_OBJECTS, onChange, className = "" }) {
  const selectedValues = Array.isArray(value) ? value : ALL_LABEL_OBJECTS;

  const toggleObject = (objectValue) => {
    const nextValues = selectedValues.includes(objectValue)
      ? selectedValues.filter((value) => value !== objectValue)
      : [...selectedValues, objectValue];

    onChange(nextValues);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {OBJECT_OPTIONS.map((option) => (
        <label
          key={option.value}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
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
  );
}