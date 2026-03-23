import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

function normalizeValues(values) {
  if (Array.isArray(values)) return values.map((value) => `${value}`.trim()).filter(Boolean);
  if (typeof values === "string" && values.trim()) return [values.trim()];
  return [];
}

function applyInput(values, inputValue) {
  const nextValue = inputValue.trim();
  if (!nextValue) return values;
  if (values.includes(nextValue)) return values;
  return [...values, nextValue];
}

export default function MultiValueInlineField({ values, onSave, placeholder }) {
  const normalizedValues = useMemo(() => normalizeValues(values), [values]);
  const [editing, setEditing] = useState(false);
  const [draftValues, setDraftValues] = useState(normalizedValues);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) {
      setDraftValues(normalizedValues);
      setInputValue("");
    }
  }, [normalizedValues, editing]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = () => {
    const finalValues = applyInput(draftValues, inputValue);
    setEditing(false);
    setInputValue("");
    if (JSON.stringify(finalValues) !== JSON.stringify(normalizedValues)) onSave(finalValues);
  };

  const addCurrentValue = () => {
    const nextValues = applyInput(draftValues, inputValue);
    setDraftValues(nextValues);
    setInputValue("");
  };

  const removeValue = (valueToRemove) => {
    setDraftValues((current) => current.filter((value) => value !== valueToRemove));
  };

  if (editing) {
    return (
      <div
        className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) commit();
        }}>
        
        {draftValues.map((value) =>
        <span key={value} className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
            {value}
            <button
            type="button"
            onClick={() => removeValue(value)}
            className="rounded-full text-slate-500 transition-colors hover:text-slate-700">
            
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
              e.preventDefault();
              addCurrentValue();
            }
            if (e.key === "Backspace" && !inputValue && draftValues.length) {
              e.preventDefault();
              removeValue(draftValues[draftValues.length - 1]);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
              setDraftValues(normalizedValues);
              setInputValue("");
            }
          }}
          placeholder={placeholder}
          className="min-w-[180px] flex-1 border-0 bg-transparent p-0 text-sm text-slate-800 outline-none placeholder:text-slate-400 placeholder:text-xs" />
        
      </div>);

  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50"
      title="Click to edit">
      
      {normalizedValues.length ?
      normalizedValues.map((value) =>
      <span key={value} className="bg-slate-200 text-slate-700 px-3 py-1 text-xs font-medium rounded-full inline-flex items-center">
            {value}
          </span>
      ) :

      <span className="text-xs text-slate-400">{placeholder}</span>
      }
    </button>);

}