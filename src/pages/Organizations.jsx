import React, { useState, useMemo, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrganizationDetailView from "@/components/organizations/OrganizationDetailView";
import SearchPanel from "@/components/search/SearchPanel";
import NewAccountDialog from "@/components/organizations/NewAccountDialog";
import DuplicatesReview from "@/components/organizations/DuplicatesReview";
import { motion } from "framer-motion";
import { Building2, Search, X, Plus, ChevronUp, ChevronDown, ChevronsUpDown, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Organizations() {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [sortField, setSortField] = useState("organization_name");
  const [sortDir, setSortDir] = useState("asc");
  const [filterState, setFilterState] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
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

  // Unique states and types for filter dropdowns
  const uniqueStates = useMemo(() => [...new Set(organizations.map(o => o.state).filter(Boolean))].sort(), [organizations]);
  const uniqueTypes = useMemo(() => [...new Set(organizations.map(o => o.organization_type).filter(Boolean))].sort(), [organizations]);

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
      const matchesState = !filterState || org.state === filterState;
      const matchesType = !filterType || org.organization_type === filterType;
      return matchesSearch && matchesState && matchesType;
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
  }, [organizations, searchQuery, filterState, filterType, sortField, sortDir]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-400 inline ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
  };

  const COLUMNS = [
    { key: "organization_name", label: "Name" },
    { key: "organization_type", label: "Organization Type" },
    { key: "created_by", label: "Record Owner" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "phone", label: "Phone" },
    { key: "created_date", label: "Created Date" },
  ];

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
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-shrink-0 flex-wrap">
          <Button
            onClick={() => setShowNewAccountDialog(true)}
            style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: 'white' }}
            className="hover:opacity-90 h-8 text-xs px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Account
          </Button>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-8 h-8 text-xs w-56"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700"
          >
            <option value="">All States</option>
            {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="h-8 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700"
          >
            <option value="">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

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
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left px-3 py-2.5 font-semibold text-slate-600 cursor-pointer hover:text-slate-900 whitespace-nowrap select-none"
                    >
                      {col.label}<SortIcon field={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p>No organizations found</p>
                    </td>
                  </tr>
                ) : filteredAndSorted.map(org => (
                  <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setSelectedOrg(org)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                      >
                        {org.organization_name || "—"}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{org.organization_type || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{org.created_by || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{org.city || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{org.state || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{org.phone || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{org.created_date ? format(new Date(org.created_date), "MMM d, yyyy") : "—"}</td>
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