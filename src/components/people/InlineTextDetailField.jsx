import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink } from "lucide-react";

export default function InlineTextDetailField({
  value,
  onSave,
  placeholder,
  multiline = false,
  isLink = false
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value || "");
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const nextValue = draft.trim() || null;
    if (nextValue !== (value || null)) onSave(nextValue);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value || "");
  };

  if (editing) {
    if (multiline) {
      return (
        <Textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
          rows={3}
          className="min-h-[84px] text-sm" />);


    }

    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") cancel();
        }}
        className="h-10 text-sm" />);


  }

  if (value && isLink) {
    const href = value.startsWith("http") ? value : `https://${value}`;
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
          
          {value.replace(/^https?:\/\/(www\.)?/, "")}
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

      <span className="text-slate-400">{placeholder}</span>
      }
    </button>);

}