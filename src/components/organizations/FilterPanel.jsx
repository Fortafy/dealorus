import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";

export default function FilterPanel({ open, onClose, filters, onChange, uniqueStates, uniqueTypes, uniqueOwners }) {
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-800">Filters</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Filter fields */}
      <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

        {/* Type */}
        <div>
          <label className={labelClass}>Organization Type</label>
          <select value={filters.type} onChange={e => update("type", e.target.value)} className={selectClass}>
            <option value="">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* State */}
        <div>
          <label className={labelClass}>State</label>
          <select value={filters.state} onChange={e => update("state", e.target.value)} className={selectClass}>
            <option value="">All States</option>
            {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Created Date Range */}
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

        {/* Updated Date Range */}
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

        {/* Record Owner */}
        <div>
          <label className={labelClass}>Record Owner</label>
          <select value={filters.owner} onChange={e => update("owner", e.target.value)} className={selectClass}>
            <option value="">All Owners</option>
            {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Revenue Range */}
        <div>
          <label className={labelClass}>Annual Revenue</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <span className="text-xs text-slate-400 mb-1 block">Min ($)</span>
              <input
                type="number"
                placeholder="0"
                value={filters.revenueMin}
                onChange={e => update("revenueMin", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <span className="text-xs text-slate-400 mb-1 block">Max ($)</span>
              <input
                type="number"
                placeholder="Any"
                value={filters.revenueMax}
                onChange={e => update("revenueMax", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}