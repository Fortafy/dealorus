import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrganizationDetailView from "@/components/organizations/OrganizationDetailView";
import SearchPanel from "@/components/search/SearchPanel";
import NewAccountDialog from "@/components/organizations/NewAccountDialog";
import DuplicatesReview from "@/components/organizations/DuplicatesReview";
import { motion } from "framer-motion";
import { Building2, Search, X, Plus, ChevronUp, ChevronDown, ChevronsUpDown, ArrowLeft, ChevronRight, Home, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import SavedFilterSelector from "@/components/organizations/SavedFilterSelector";
import FilterPanel from "@/components/organizations/FilterPanel";
import FieldsPanel, { ALL_COLUMNS, DEFAULT_VISIBLE_FIELDS } from "@/components/organizations/FieldsPanel";

export default function Organizations() {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [sortField, setSortField] = useState("organization_name");
  const [sortDir, setSortDir] = useState("asc");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilterId, setActiveFilterId] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterButtonRef = useRef(null);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Organization.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });

  const handleEdit = (updatedData) => {
    updateMutation.mutate({ id: updatedData.id, data: updatedData });
    setSelectedOrg(updatedData);
  };

  const EMPTY_FILTERS = {
    type: "", state: "", owner: "",
    createdFrom: "", createdTo: "",
    updatedFrom: "", updatedTo: "",
    revenueMin: "", revenueMax: "",
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const handleSelectFilter = (id, savedFilters) => {
    setActiveFilterId(id);
    if (savedFilters) {
      setFilters({ ...EMPTY_FILTERS, state: savedFilters.state || "", type: savedFilters.type || "" });
      setSearchQuery(savedFilters.search || "");
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

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-400 inline ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
  };

  const COLUMNS = [
    { key: "organization_name", label: "Name", defaultWidth: 220 },
    { key: "organization_type", label: "Organization Type", defaultWidth: 180 },
    { key: "city", label: "City", defaultWidth: 130 },
    { key: "state", label: "State", defaultWidth: 90 },
    { key: "phone", label: "Phone", defaultWidth: 130 },
    { key: "created_date", label: "Created Date", defaultWidth: 120 },
    { key: "created_by", label: "Record Owner", defaultWidth: 130 },
  ];

  const [colWidths, setColWidths] = useState(() =>
    Object.fromEntries(COLUMNS.map(c => [c.key, c.defaultWidth]))
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

  if (selectedOrg) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0">
          <button onClick={() => setSelectedOrg(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 flex items-center gap-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Organizations
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <OrganizationDetailView
            organizationId={selectedOrg.id}
            onClose={() => setSelectedOrg(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">

        {/* Page Header Row */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Home className="w-3.5 h-3.5" />
              <ChevronRight className="w-3 h-3" />
            </div>
            {/* Page title */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: 'hsl(217, 91%, 93%)' }}>
                <Building2 className="w-4 h-4" style={{ color: 'hsl(217, 91%, 45%)' }} />
              </div>
              <span className="text-base font-semibold text-slate-800">Organizations</span>
              <span className="text-xs text-slate-400 font-normal ml-1">{organizations.length}</span>
            </div>
          </div>
          <Button
            onClick={() => setShowNewAccountDialog(true)}
            style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: 'white' }}
            className="hover:opacity-90 h-8 text-xs px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Account
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-shrink-0 flex-wrap">
          {/* Saved filter list selector */}
          <SavedFilterSelector
            currentUser={currentUser}
            activeFilter={activeFilterId}
            onSelectFilter={handleSelectFilter}
            currentFilters={{ state: filters.state, type: filters.type, search: searchQuery }}
          />

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setActiveFilterId(null); }}
              placeholder="Search..."
              className="pl-8 pr-8 h-8 text-xs w-56"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter button */}
          <div className="relative" ref={filterButtonRef}>
            <div className="flex items-center">
              <button
                onClick={() => setShowFilterPanel(p => !p)}
                className={`flex items-center gap-2 h-8 px-3 text-xs border transition-colors ${
                  activeFilterCount > 0
                    ? "rounded-l-lg border-blue-400 bg-blue-50 text-blue-700 font-medium"
                    : "rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center h-8 w-8 border border-l-0 border-blue-400 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-r-lg transition-colors"
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

          <span className="text-xs text-slate-400 ml-auto">
            {filteredAndSorted.length} record{filteredAndSorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-7 h-7 border-2 border-blue-100 rounded-full animate-spin" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
            </div>
          ) : (
            <table className="text-xs" style={{ tableLayout: "fixed", width: COLUMNS.reduce((sum, c) => sum + colWidths[c.key], 0) }}>
              <colgroup>
                {COLUMNS.map(col => (
                  <col key={col.key} style={{ width: colWidths[col.key] }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className="text-left py-2.5 font-semibold text-slate-600 whitespace-nowrap select-none relative group"
                      style={{ width: colWidths[col.key] }}
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
                    </td>
                  </tr>
                ) : filteredAndSorted.map(org => (
                  <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 truncate">
                      <button
                        onClick={() => setSelectedOrg(org)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left truncate w-full"
                      >
                        {org.organization_name || "—"}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-slate-600 truncate">{org.organization_type || "—"}</td>
                    <td className="px-3 py-2 text-slate-600 truncate">{org.city || "—"}</td>
                    <td className="px-3 py-2 text-slate-600 truncate">{org.state || "—"}</td>
                    <td className="px-3 py-2 text-slate-600 truncate">{org.phone || "—"}</td>
                    <td className="px-3 py-2 text-slate-500 truncate">{org.created_date ? format(new Date(org.created_date), "MMM d, yyyy") : "—"}</td>
                    <td className="px-3 py-2 text-slate-600 truncate">{org.created_by ? org.created_by.split("@")[0] : "—"}</td>
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