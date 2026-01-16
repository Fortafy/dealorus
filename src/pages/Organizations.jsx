import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrganizationCard from "@/components/results/OrganizationCard";
import ContactSearch from "@/components/contacts/ContactSearch";
import AdvancedFilters from "@/components/organizations/AdvancedFilters";
import SearchDialog from "@/components/search/SearchDialog";
import { motion } from "framer-motion";
import { Building2, Search, Trash2, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Organizations() {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    state: "",
    organization_type: "",
    ntee_code: "",
    min_revenue: "",
    max_revenue: "",
  });
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.SearchResult.list("-created_date"),
  });

  // Check for pre-selected organization from URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get("id");
    if (orgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === orgId);
      if (org) {
        setSelectedOrg(org);
      }
    }
  }, [organizations]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SearchResult.delete(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      if (selectedOrg && selectedOrg.id === variables) {
        setSelectedOrg(null);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SearchResult.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  const handleEdit = (updatedData) => {
    updateMutation.mutate({ id: updatedData.id, data: updatedData });
    setSelectedOrg(updatedData);
  };

  const parseRevenue = (revenueStr) => {
    if (!revenueStr) return 0;
    const cleaned = revenueStr.replace(/[$,]/g, "");
    return parseFloat(cleaned) || 0;
  };

  const filteredOrgs = organizations.filter((org) => {
    // Multi-field search
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      org.organization_name?.toLowerCase().includes(searchLower) ||
      org.state?.toLowerCase().includes(searchLower) ||
      org.city?.toLowerCase().includes(searchLower) ||
      org.ein?.toLowerCase().includes(searchLower) ||
      org.organization_type?.toLowerCase().includes(searchLower) ||
      org.ntee_code?.toLowerCase().includes(searchLower);

    // Filter by state
    const matchesState = !filters.state || org.state === filters.state;

    // Filter by organization type
    const matchesType = !filters.organization_type || 
      org.organization_type?.toLowerCase().includes(filters.organization_type.toLowerCase());

    // Filter by NTEE code
    const matchesNtee = !filters.ntee_code || 
      org.ntee_code?.toLowerCase().includes(filters.ntee_code.toLowerCase());

    // Filter by revenue range
    const revenue = parseRevenue(org.annual_revenue);
    const matchesMinRevenue = !filters.min_revenue || revenue >= parseFloat(filters.min_revenue);
    const matchesMaxRevenue = !filters.max_revenue || revenue <= parseFloat(filters.max_revenue);

    return matchesSearch && matchesState && matchesType && matchesNtee && 
           matchesMinRevenue && matchesMaxRevenue;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">Organizations</h1>
              <p className="text-sm text-slate-500">Browse all enriched organizations</p>
            </div>
            <Button
              onClick={() => setSearchDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Search
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Organizations List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-4 sticky top-24 max-h-[calc(100vh-7rem)] flex flex-col">
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search across all fields..."
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <AdvancedFilters
                  filters={filters}
                  onFilterChange={setFilters}
                  onClear={() => setFilters({
                    state: "",
                    organization_type: "",
                    ntee_code: "",
                    min_revenue: "",
                    max_revenue: "",
                  })}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                ) : filteredOrgs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No organizations found</p>
                  </div>
                ) : (
                  filteredOrgs.map((org, index) => (
                    <motion.div
                      key={org.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <button
                        onClick={() => setSelectedOrg(org)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedOrg?.id === org.id
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-100 hover:border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-slate-900 truncate">
                              {org.organization_name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {org.city ? `${org.city}, ` : ""}{org.state}
                            </p>
                            {org.organization_type && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                {org.organization_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Organization Details */}
          <div className="lg:col-span-2">
            {selectedOrg ? (
              <motion.div
                key={selectedOrg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <OrganizationCard 
                  data={selectedOrg} 
                  onSave={() => {}} 
                  isSaved={true}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onEdit={handleEdit}
                />
                <ContactSearch organization={selectedOrg} />
              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Select an Organization
                </h3>
                <p className="text-slate-500">
                  Choose an organization from the list to view its details
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSearchComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["organizations"] });
        }}
      />
    </div>
  );
}