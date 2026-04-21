import React, { useState, useMemo, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OrganizationDetailView from "@/components/organizations/OrganizationDetailView";
import NewAccountDialog from "@/components/organizations/NewAccountDialog";
import { Building2, Search, X, Plus, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, Upload, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import SavedFilterSelector from "@/components/organizations/SavedFilterSelector";
import FilterPanel from "@/components/organizations/FilterPanel";
import FieldsPanel, { ALL_COLUMNS, DEFAULT_VISIBLE_FIELDS } from "@/components/organizations/FieldsPanel";
import SeedDemoDataButton from "@/components/demo/SeedDemoDataButton";

export default function Organizations() {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [sortField, setSortField] = useState("organization_name");
  const [sortDir, setSortDir] = useState("asc");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilterId, setActiveFilterId] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const filterButtonRef = useRef(null);
  const searchRef = useRef(null);
  const [visibleFields, setVisibleFields] = useState(() => {
    try {
      const stored = localStorage.getItem("org_visible_fields");
      return stored ? JSON.parse(stored) : DEFAULT_VISIBLE_FIELDS;
    } catch { return DEFAULT_VISIBLE_FIELDS; }
  });
  const [filters, setFilters] = useState({
    type: "", state: "", owner: "",
    createdFrom: "", createdTo: "",
    updatedFrom: "", updatedTo: "",
    revenueMin: "", revenueMax: "",
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!searchExpanded) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        if (!searchQuery) setSearchExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchExpanded, searchQuery]);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations", currentUser?.client_id],
    enabled: !!currentUser?.client_id,
    queryFn: () => base44.entities.Organization.filter({ client_id: currentUser.client_id }, "-created_date"),
  });

  // Check for pre-selected organization from URL
  React.useEffect(() => {
    if (!currentUser?.client_id) return;
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get("id");
    if (orgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === orgId);
      if (org) setSelectedOrg(org);
    }
  }, [organizations, currentUser]);

  const EMPTY_FILTERS = {
    type: "", state: "", owner: "",
    createdFrom: "", createdTo: "",
    updatedFrom: "", updatedTo: "",
    revenueMin: "", revenueMax: "",
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const handleFieldsChange = (fields) => {
    setVisibleFields(fields);
    try { localStorage.setItem("org_visible_fields", JSON.stringify(fields)); } catch {}
  };

  const handleSelectFilter = (id, savedFilters, savedFields) => {
    setActiveFilterId(id);
    if (savedFilters) {
      setFilters({ ...EMPTY_FILTERS, state: savedFilters.state || "", type: savedFilters.type || "" });
      setSearchQuery(savedFilters.search || "");
      if (savedFields && savedFields.length > 0) handleFieldsChange(savedFields);
    } else {
      setFilters(EMPTY_FILTERS);
      setSearchQuery("");
    }
  };

  // Unique values for filter dropdowns
  const uniqueStates = useMemo(() => [...new Set(organizations.map(o => o.state).filter(Boolean))].sort(), [organizations]);
  const uniqueTypes = useMemo(() => [...new Set(organizations.map(o => o.organization_type).filter(Boolean))].sort(), [organizations]);
  const uniqueOwners = useMemo(() => [...new Set(organizations.map(o => o.created_by ? o.created_by.split("@")[0] : null).filter(Boolean))].sort(), [organizations]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    let result = organizations.filter(org => {
      const matchesSearch = !searchQuery ||
        org.organization_name?.toLowerCase().includes(searchLower) ||
        org.state?.toLowerCase().includes(searchLower) ||
        org.city?.toLowerCase().includes(searchLower) ||
        org.phone?.toLowerCase().includes(searchLower) ||
        org.organization_type?.toLowerCase().includes(searchLower);
      const matchesState = !filters.state || org.state === filters.state;
      const matchesType = !filters.type || org.organization_type === filters.type;
      const matchesOwner = !filters.owner || (org.created_by && org.created_by.split("@")[0] === filters.owner);
      const createdDate = org.created_date ? new Date(org.created_date) : null;
      const matchesCreatedFrom = !filters.createdFrom || (createdDate && createdDate >= new Date(filters.createdFrom));
      const matchesCreatedTo = !filters.createdTo || (createdDate && createdDate <= new Date(filters.createdTo + "T23:59:59"));
      const updatedDate = org.updated_date ? new Date(org.updated_date) : null;
      const matchesUpdatedFrom = !filters.updatedFrom || (updatedDate && updatedDate >= new Date(filters.updatedFrom));
      const matchesUpdatedTo = !filters.updatedTo || (updatedDate && updatedDate <= new Date(filters.updatedTo + "T23:59:59"));
      const revenue = parseFloat(org.annual_revenue) || 0;
      const matchesRevenueMin = !filters.revenueMin || revenue >= parseFloat(filters.revenueMin);
      const matchesRevenueMax = !filters.revenueMax || revenue <= parseFloat(filters.revenueMax);
      return matchesSearch && matchesState && matchesType && matchesOwner &&
        matchesCreatedFrom && matchesCreatedTo && matchesUpdatedFrom && matchesUpdatedTo &&
        matchesRevenueMin && matchesRevenueMax;
    });

    result.sort((a, b) => {
      let av = a[sortField] ?? "";
      let bv = b[sortField] ?? "";
      if (sortField === "created_date") {
        av = new Date(av);
        bv = new Date(bv);
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [organizations, searchQuery, filters, sortField, sortDir]);

  const isEmptyAccount = !isLoading && organizations.length === 0;

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-400 inline ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
  };

  // All column widths stored for every possible column
  const [colWidths, setColWidths] = useState(() =>
    Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultWidth]))
  );

  // Active columns derived from visibleFields order
  const COLUMNS = useMemo(
    () => visibleFields.map(key => ALL_COLUMNS.find(c => c.key === key)).filter(Boolean),
    [visibleFields]
  );
  const resizingRef = useRef(null);

  const startResize = useCallback((e, key) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[key];
    resizingRef.current = { key, startX, startWidth };

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(60, resizingRef.current.startWidth + delta);
      setColWidths(prev => ({ ...prev, [resizingRef.current.key]: newWidth }));
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [colWidths]);

  const renderCell = (key, org) => {
    const val = org[key];
    if (val === null || val === undefined || val === "") return <span className="text-slate-400">—</span>;
    if (key === "created_date" || key === "updated_date") {
      return <span className="text-slate-500">{format(new Date(val), "MMM d, yyyy")}</span>;
    }
    if (key === "created_by") {
      return <span className="text-slate-600">{val.split("@")[0]}</span>;
    }
    if (key === "is_client") {
      return <span className={`text-xs font-medium ${val ? "text-green-600" : "text-slate-400"}`}>{val ? "Yes" : "No"}</span>;
    }
    if (key === "website") {
      return <a href={val} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate block">{val}</a>;
    }
    return <span className="text-slate-600">{String(val)}</span>;
  };

  if (selectedOrg) {
    return (
      <div className="h-full flex flex-col bg-white overflow-hidden">
        <OrganizationDetailView
          organizationId={selectedOrg.id}
          onClose={() => setSelectedOrg(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#e9f1ff]">
              <Building2 className="h-4 w-4 text-[#4f7cff]" />
            </div>
            <span className="text-[20px] font-semibold tracking-[-0.02em] text-[#182230]">Organizations</span>
          </div>
          <div className="flex items-center gap-2">
            {isEmptyAccount && currentUser?.client_id && (
              <SeedDemoDataButton
                clientId={currentUser.client_id}
                userId={currentUser.id}
              />
            )}
            <Link
              to="/organizations/import"
              className="flex h-8 items-center gap-1.5 rounded-[10px] border border-[#d9e2ef] bg-white px-3 text-[11px] font-medium text-[#475467] transition-colors hover:bg-[#f8fafc]"
            >
              <Upload className="h-3.5 w-3.5" /> Import
            </Link>
            <Link
              to="/organizations/export"
              className="flex h-8 items-center gap-1.5 rounded-[10px] border border-[#d9e2ef] bg-white px-3 text-[11px] font-medium text-[#475467] transition-colors hover:bg-[#f8fafc]"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Link>
            <Button
              onClick={() => setShowNewAccountDialog(true)}
              className="h-8 rounded-[10px] bg-[#5b3df5] px-3 text-[11px] font-semibold text-white hover:bg-[#4e33e8]"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Account
            </Button>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-[#e8edf5]" />

        <div className="flex flex-shrink-0 items-center gap-2 px-6 py-3">
          {/* Saved filter list selector */}
          <SavedFilterSelector
            currentUser={currentUser}
            activeFilter={activeFilterId}
            onSelectFilter={handleSelectFilter}
            currentFilters={{ state: filters.state, type: filters.type, search: searchQuery }}
            currentFields={visibleFields}
            recordCount={filteredAndSorted.length}
          />

          {/* Fields button */}
          <FieldsPanel visibleFields={visibleFields} onChange={handleFieldsChange} />

          {/* Filter button */}
          <div className="relative" ref={filterButtonRef}>
            <div className="flex items-center">
              <button
                onClick={() => setShowFilterPanel(p => !p)}
                className={`flex h-8 items-center gap-2 rounded-[10px] border px-3 text-[11px] font-medium transition-colors ${
                  activeFilterCount > 0
                    ? "rounded-l-[10px] border-[#c7d7fe] bg-[#eef4ff] text-[#3b5ccc]"
                    : "border-[#d9e2ef] bg-white text-[#475467] hover:bg-[#f8fafc]"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#5b3df5] text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex h-8 w-8 items-center justify-center rounded-r-[10px] border border-l-0 border-[#c7d7fe] bg-[#eef4ff] text-[#5b3df5] transition-colors hover:bg-[#e6eeff]"
                  title="Clear all filters"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <FilterPanel
              open={showFilterPanel}
              onClose={() => setShowFilterPanel(false)}
              filters={filters}
              onChange={(f) => { setFilters(f); setActiveFilterId(null); }}
              uniqueStates={uniqueStates}
              uniqueTypes={uniqueTypes}
              uniqueOwners={uniqueOwners}
            />
          </div>

          {/* Search — icon that expands */}
          <div ref={searchRef} className="flex items-center">
            {searchExpanded ? (
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setActiveFilterId(null); }}
                  placeholder="Search..."
                  className="h-8 w-52 rounded-[10px] border-[#d9e2ef] pl-8 pr-8 text-[11px] text-[#344054] transition-all"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setSearchExpanded(true)}
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] border transition-colors ${
                  searchQuery
                    ? "border-[#c7d7fe] bg-[#eef4ff] text-[#5b3df5]"
                    : "border-[#d9e2ef] bg-white text-[#667085] hover:bg-[#f8fafc]"
                }`}
                title="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </div>


        </div>

        <div className="flex-shrink-0 border-t border-[#e8edf5]" />

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-7 h-7 border-2 border-blue-100 rounded-full animate-spin" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
            </div>
          ) : (
            <table className="w-full text-[11px]" style={{ tableLayout: "fixed", minWidth: COLUMNS.reduce((sum, c) => sum + (colWidths[c.key] || c.defaultWidth), 0) }}>
              <colgroup>
                {COLUMNS.map(col => (
                  <col key={col.key} style={{ width: colWidths[col.key] }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10 border-b border-[#e8edf5] bg-[#fbfcfe]">
                <tr>
                  {COLUMNS.map((col, i) => (
                    <th
                      key={col.key}
                      className="relative group whitespace-nowrap border-r border-[#edf1f7] py-3 text-left text-[11px] font-semibold text-[#475467] last:border-r-0 select-none"
                      style={{
                        width: colWidths[col.key],
                        ...(i === 0 ? { position: "sticky", left: 0, zIndex: 20, background: "#fbfcfe" } : {}),
                      }}
                    >
                      <span
                        onClick={() => handleSort(col.key)}
                        className="cursor-pointer hover:text-slate-900 pl-3 pr-4 block truncate"
                      >
                        {col.label}<SortIcon field={col.key} />
                      </span>
                      {/* Resize handle */}
                      <div
                        onMouseDown={(e) => startResize(e, col.key)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100"
                        style={{ userSelect: "none" }}
                      >
                        <div className="w-0.5 h-4 bg-slate-300 rounded-full" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="text-center py-16 text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p>No organizations found</p>
                      {isEmptyAccount && currentUser?.client_id && (
                        <div className="mt-4 flex justify-center">
                          <SeedDemoDataButton
                            clientId={currentUser.client_id}
                            userId={currentUser.id}
                            onSeeded={() => setActiveFilterId(null)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ) : filteredAndSorted.map(org => (
                  <tr key={org.id} className="group transition-colors hover:bg-[#fafcff]">
                    {COLUMNS.map((col, i) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 truncate border-r border-slate-100 last:border-r-0${i === 0 ? " bg-white group-hover:bg-slate-50" : ""}`}
                        style={i === 0 ? { position: "sticky", left: 0, zIndex: 1 } : {}}
                      >
                        {i === 0 ? (
                          <button
                            onClick={() => setSelectedOrg(org)}
                            className="w-full truncate text-left font-medium text-[#4f7cff] hover:underline hover:text-[#3b6df6]"
                          >
                            {org[col.key] || "—"}
                          </button>
                        ) : renderCell(col.key, org)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NewAccountDialog
        open={showNewAccountDialog}
        onOpenChange={setShowNewAccountDialog}
        onSaved={(org) => {
          queryClient.invalidateQueries({ queryKey: ["organizations"] });
          if (org?.id) setSelectedOrg(org);
        }}
      />
    </div>
  );
}