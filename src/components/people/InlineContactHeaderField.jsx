import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export default function InlineContactHeaderField({
  value,
  onSave,
  placeholder,
  textClassName,
  inputClassName,
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
    if (draft !== (value || "")) onSave(draft || null);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value || "");
  };

  if (editing) {
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
        className={inputClassName}
      />
    );
  }

  return (
    <button
      type="button"
      className={textClassName}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value || placeholder}
    </button>
  );
}