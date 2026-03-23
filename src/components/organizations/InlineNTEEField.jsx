import React, { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function InlineNTEEField({ value, description, onSave, placeholder = "Add Classification" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState({ status: null, description: null });
  const inputRef = useRef(null);
  const validationTimerRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setDraft(value || "");
      setValidation({ status: null, description: null });
    }
  }, [value, editing]);

  useEffect(() => {
    return () => {
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    };
  }, []);

  const validateCode = (nextValue) => {
    if (validationTimerRef.current) clearTimeout(validationTimerRef.current);

    if (!nextValue.trim()) {
      setValidation({ status: null, description: null });
      return;
    }

    validationTimerRef.current = setTimeout(async () => {
      setValidating(true);
      try {
        const response = await base44.functions.invoke("validateNTEECode", { code: nextValue });
        if (response.data.valid) {
          setValidation({ status: "valid", description: response.data.description });
        } else {
          setValidation({ status: "invalid", description: null });
        }
      } catch {
        setValidation({ status: "error", description: null });
      } finally {
        setValidating(false);
      }
    }, 500);
  };

  const commit = () => {
    const nextValue = draft.trim() || null;
    setEditing(false);

    if (nextValue !== (value || null)) {
      onSave(nextValue, validation.status === "valid" ? validation.description : null);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value || "");
    setValidation({ status: null, description: null });
  };

  const displayValue = description && value ? `${description} (${value})` : description || value || null;

  if (editing) {
    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setValidation({ status: null, description: null });
              validateCode(e.target.value);
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") cancel();
            }}
            className={`h-10 pr-8 text-sm placeholder:text-xs ${validation.status === "invalid" ? "border-red-400" : validation.status === "valid" ? "border-green-400" : ""}`}
            placeholder="e.g. B20"
          />
          {validating ? <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" /> : null}
          {!validating && validation.status === "valid" ? <CheckCircle2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-green-500" /> : null}
          {!validating && validation.status === "invalid" ? <XCircle className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-red-500" /> : null}
        </div>
        {validation.status === "valid" && validation.description ? <p className="px-1 text-xs text-green-600">{validation.description}</p> : null}
        {validation.status === "invalid" ? <p className="px-1 text-xs text-red-600">Invalid NTEE code</p> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="min-h-10 w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
      title="Click to edit"
    >
      {displayValue ? <span className="text-xs text-slate-800">{displayValue}</span> : <span className="text-xs text-slate-400">{placeholder}</span>}
    </button>
  );
}