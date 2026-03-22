import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";

export default function PeopleFilterPanel({ open, onClose, filters, onChange, uniqueTitles, uniqueDepartments, uniqueOrgs, uniqueOwners }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!open) return null;

  const update = (key, value) => onChange({ ...filters, [key]: value });

  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";
  const selectClass = "w-full h-8 px-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400";
  const inputClass = "w-full h-8 px-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400";

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-800">Filters</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

        <div>
          <label className={labelClass}>Organization</label>
          <select value={filters.organization} onChange={e => update("organization", e.target.value)} className={selectClass}>
            <option value="">All Organizations</option>
            <option value="__none__">No Organization</option>
            {uniqueOrgs.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Title</label>
          <select value={filters.title} onChange={e => update("title", e.target.value)} className={selectClass}>
            <option value="">All Titles</option>
            {uniqueTitles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Department</label>
          <select value={filters.department} onChange={e => update("department", e.target.value)} className={selectClass}>
            <option value="">All Departments</option>
            {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Starred</label>
          <select value={filters.starred} onChange={e => update("starred", e.target.value)} className={selectClass}>
            <option value="">All</option>
            <option value="yes">Starred only</option>
            <option value="no">Not starred</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Created Date</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <span className="text-xs text-slate-400 mb-1 block">From</span>
              <input type="date" value={filters.createdFrom} onChange={e => update("createdFrom", e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <span className="text-xs text-slate-400 mb-1 block">To</span>
              <input type="date" value={filters.createdTo} onChange={e => update("createdTo", e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Last Updated</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <span className="text-xs text-slate-400 mb-1 block">From</span>
              <input type="date" value={filters.updatedFrom} onChange={e => update("updatedFrom", e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <span className="text-xs text-slate-400 mb-1 block">To</span>
              <input type="date" value={filters.updatedTo} onChange={e => update("updatedTo", e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Record Owner</label>
          <select value={filters.owner} onChange={e => update("owner", e.target.value)} className={selectClass}>
            <option value="">All Owners</option>
            {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}