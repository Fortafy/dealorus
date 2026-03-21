import React, { useState, useRef, useEffect } from "react";
import { Columns3, Search, X } from "lucide-react";

// All possible columns a user can toggle
export const ALL_COLUMNS = [
  { key: "organization_name", label: "Name", defaultWidth: 220, required: true },
  { key: "organization_type", label: "Organization Type", defaultWidth: 180 },
  { key: "city", label: "City", defaultWidth: 130 },
  { key: "state", label: "State", defaultWidth: 90 },
  { key: "phone", label: "Phone", defaultWidth: 130 },
  { key: "email", label: "Email", defaultWidth: 180 },
  { key: "website", label: "Website", defaultWidth: 160 },
  { key: "ein", label: "EIN", defaultWidth: 120 },
  { key: "annual_revenue", label: "Annual Revenue", defaultWidth: 140 },
  { key: "ntee_code", label: "NTEE Code", defaultWidth: 110 },
  { key: "ntee_description", label: "NTEE Description", defaultWidth: 200 },
  { key: "mission", label: "Mission", defaultWidth: 220 },
  { key: "ruling_date", label: "Ruling Date", defaultWidth: 120 },
  { key: "zip_code", label: "Zip Code", defaultWidth: 100 },
  { key: "address", label: "Address", defaultWidth: 200 },
  { key: "is_client", label: "Is Client", defaultWidth: 90 },
  { key: "assigned_to_user_id", label: "Assigned To", defaultWidth: 140 },
  { key: "created_date", label: "Created Date", defaultWidth: 120 },
  { key: "updated_date", label: "Updated Date", defaultWidth: 120 },
  { key: "created_by", label: "Record Owner", defaultWidth: 130 },
];

export const DEFAULT_VISIBLE_FIELDS = [
  "organization_name",
  "organization_type",
  "city",
  "state",
  "phone",
  "created_date",
  "created_by",
];

export default function FieldsPanel({ visibleFields, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (key) => {
    const col = ALL_COLUMNS.find(c => c.key === key);
    if (col?.required) return; // can't hide required fields
    if (visibleFields.includes(key)) {
      if (visibleFields.length === 1) return; // keep at least 1
      onChange(visibleFields.filter(k => k !== key));
    } else {
      // Insert at the position of the column in ALL_COLUMNS order
      const allKeys = ALL_COLUMNS.map(c => c.key);
      const merged = allKeys.filter(k => visibleFields.includes(k) || k === key);
      onChange(merged);
    }
  };

  const showAll = () => onChange(ALL_COLUMNS.map(c => c.key));
  const hideAll = () => onChange(["organization_name"]); // keep required

  const searchLower = search.toLowerCase();
  const filteredCols = ALL_COLUMNS.filter(c =>
    c.label.toLowerCase().includes(searchLower)
  );

  const shownCols = filteredCols.filter(c => visibleFields.includes(c.key));
  const hiddenCols = filteredCols.filter(c => !visibleFields.includes(c.key));

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 h-8 px-3 text-xs border rounded-lg transition-colors ${
          open
            ? "border-blue-400 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <Columns3 className="w-3.5 h-3.5" />
        <span>Fields</span>
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
          {visibleFields.length}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search fields..."
                className="w-full pl-8 pr-3 h-7 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Shown in view */}
            {shownCols.length > 0 && (
              <>
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Shown in view</span>
                  {!search && (
                    <button onClick={hideAll} className="text-[11px] text-blue-600 hover:underline font-medium">Hide all</button>
                  )}
                </div>
                {shownCols.map(col => (
                  <FieldRow
                    key={col.key}
                    col={col}
                    visible={true}
                    onToggle={() => toggle(col.key)}
                  />
                ))}
              </>
            )}

            {/* More fields / hidden */}
            {hiddenCols.length > 0 && (
              <>
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">More fields</span>
                  {!search && (
                    <button onClick={showAll} className="text-[11px] text-blue-600 hover:underline font-medium">Show all</button>
                  )}
                </div>
                {hiddenCols.map(col => (
                  <FieldRow
                    key={col.key}
                    col={col}
                    visible={false}
                    onToggle={() => toggle(col.key)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ col, visible, onToggle }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2 hover:bg-slate-50 cursor-pointer group ${col.required ? "opacity-60 cursor-default" : ""}`}
      onClick={col.required ? undefined : onToggle}
    >
      <span className="text-sm text-slate-700">{col.label}</span>
      {/* Toggle switch */}
      <button
        onClick={e => { e.stopPropagation(); if (!col.required) onToggle(); }}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
          visible ? "bg-green-500" : "bg-slate-200"
        }`}
        disabled={col.required}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            visible ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}