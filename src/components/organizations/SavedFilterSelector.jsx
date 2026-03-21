import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, Check, Plus, Save, X, Search } from "lucide-react";

export default function SavedFilterSelector({ currentUser, activeFilter, onSelectFilter, currentFilters, currentFields }) {
  const [open, setOpen] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();

  const hasActiveFilters = currentFilters.state || currentFilters.type || currentFilters.search;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setShowSaveForm(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: savedFilters = [] } = useQuery({
    queryKey: ["saved-filters", currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: () => base44.entities.SavedFilter.filter({ user_id: currentUser.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedFilter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      setShowSaveForm(false);
      setSaveName("");
    },
  });

  const handleSave = () => {
    if (!saveName.trim()) return;
    createMutation.mutate({
      client_id: currentUser.client_id,
      user_id: currentUser.id,
      name: saveName.trim(),
      filters: currentFilters,
      fields: currentFields || [],
    });
  };

  const activeLabel = activeFilter
    ? savedFilters.find(f => f.id === activeFilter)?.name || "All Organizations"
    : "All Organizations";

  const filtered = savedFilters.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => { setOpen(o => !o); setShowSaveForm(false); setSearch(""); }}
        className="flex items-center gap-2 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Building2 className="w-3.5 h-3.5 text-slate-500" />
        <span>{activeLabel}</span>
        <span className="text-slate-400 font-normal ml-0.5">·</span>
        <span className="text-slate-400 font-normal">{activeFilter ? "" : "All"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search lists..."
                className="w-full pl-8 pr-3 h-7 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* List items */}
          <div className="py-1 max-h-56 overflow-y-auto">
            {/* All organizations default */}
            <button
              onClick={() => { onSelectFilter(null); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="flex-1 text-left">All Organizations</span>
              {!activeFilter && <Check className="w-3.5 h-3.5 text-blue-500" />}
            </button>

            {filtered.map(f => (
              <button
                key={f.id}
                onClick={() => { onSelectFilter(f.id, f.filters, f.fields); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="flex-1 text-left">{f.name}</span>
                {activeFilter === f.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
              </button>
            ))}
          </div>

          {/* Save current filters */}
          <div className="border-t border-slate-100">
            {showSaveForm ? (
              <div className="p-3 flex flex-col gap-2">
                <input
                  autoFocus
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setShowSaveForm(false); }}
                  placeholder="List name..."
                  className="w-full px-3 h-7 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim() || createMutation.isPending}
                    className="flex-1 h-7 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowSaveForm(false); setSaveName(""); }}
                    className="h-7 px-2 text-xs rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveForm(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{hasActiveFilters ? "Save current filters as list" : "New list"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}