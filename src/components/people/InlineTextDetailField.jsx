import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink } from "lucide-react";

export default function InlineTextDetailField({
  value,
  onSave,
  placeholder,
  multiline = false,
  isLink = false,
  validate,
  validationMessage,
  displayValueFormatter
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) return;

    const handlePointerDown = (event) => {
      if (wrapperRef.current?.contains(event.target)) return;
      commit();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [editing, draft, value]);

  useEffect(() => {
    if (!editing) {
      setDraft(value || "");
      setError("");
    }
  }, [value, editing]);

  const commit = () => {
    const nextValue = draft.trim() || null;

    if (nextValue && validate && !validate(nextValue)) {
      setError(validationMessage || "Invalid value");
      return;
    }

    setError("");
    setEditing(false);
    if (nextValue !== (value || null)) onSave(nextValue);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value || "");
    setError("");
  };

  if (editing) {
    if (multiline) {
      return (
        <div ref={wrapperRef} className="space-y-1">
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError("");
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
            rows={3}
            className="min-h-[84px] text-sm placeholder:text-xs" />
          {error ? <p className="px-1 text-xs text-red-600">{error}</p> : null}
        </div>);


    }

    return (
      <div ref={wrapperRef} className="space-y-1">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError("");
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") cancel();
          }}
          className="h-10 text-sm placeholder:text-xs" />
        {error ? <p className="px-1 text-xs text-red-600">{error}</p> : null}
      </div>);


  }

  if (value && isLink) {
    const href = value.startsWith("http") ? value : `https://${value}`;
    const displayValue = displayValueFormatter ? displayValueFormatter(value) : value.replace(/^https?:\/\/(www\.)?/, "");
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50"
        title="Click to edit">
        
        <a
          href={href}
          target="_blank"
          rel="noreferrer" className="text-blue-600 text-xs flex items-center gap-1 break-all hover:underline"

          onClick={(e) => e.stopPropagation()}>
          
          {displayValue}
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
        </a>
      </button>);

  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="min-h-10 w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
      title="Click to edit">
      
      {value ?
      <span className="text-slate-800 text-xs">{value}</span> :

      <span className="text-slate-400 text-xs">{placeholder}</span>
      }
    </button>);

}