import React, { useEffect, useRef } from "react";

const CONTRACT_TYPES = [
  { value: "monthly_retainer", label: "Monthly Retainer" },
  { value: "ad_hoc", label: "Ad Hoc" },
  { value: "project", label: "Project" },
];

export default function DealsFilterPanel({ open, onClose, filters, onChange, organizations = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4 w-64 space-y-3"
    >
      <p className="text-xs font-semibold text-slate-700">Filter Deals</p>

      <div>
        <label className="text-[11px] text-slate-500 mb-1 block">Contract Type</label>
        <select
          value={filters.contractType}
          onChange={e => onChange({ ...filters, contractType: e.target.value })}
          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
        >
          <option value="">All types</option>
          {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[11px] text-slate-500 mb-1 block">Organization</label>
        <select
          value={filters.orgId}
          onChange={e => onChange({ ...filters, orgId: e.target.value })}
          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
        >
          <option value="">All organizations</option>
          {organizations.map(o => <option key={o.id} value={o.id}>{o.organization_name}</option>)}
        </select>
      </div>
    </div>
  );
}