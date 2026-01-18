import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrganizationCard from "@/components/results/OrganizationCard";
import ContactSearch from "@/components/contacts/ContactSearch";
import AdvancedFilters from "@/components/organizations/AdvancedFilters";
import SearchPanel from "@/components/search/SearchPanel";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { Building2, Search, Trash2, X, Plus, Home, Users, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function Organizations() {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [filters, setFilters] = useState({
    state: "",
    organization_type: "",
    ntee_code: "",
    min_revenue: "",
    max_revenue: "",
  });
  const [currentUser, setCurrentUser] = useState(null);
  const rightColumnRef = React.useRef(null);
  const queryClient = useQueryClient();

  // Fetch current user
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      }
    };
    fetchUser();
  }, []);

  // Scroll to top when organization is selected
  React.useEffect(() => {
    if (selectedOrg && rightColumnRef.current) {
      rightColumnRef.current.scrollTop = 0;
    }
  }, [selectedOrg]);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations", currentUser?.organization_id],
    enabled: !!currentUser?.organization_id,
    queryFn: () => base44.entities.SearchResult.filter({ organization_id: currentUser.organization_id }, "-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", currentUser?.organization_id],
    enabled: !!currentUser?.organization_id,
    queryFn: () => base44.entities.Contact.filter({ organization_id: currentUser.organization_id }, "-created_date"),
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

  // Dashboard component
  const DashboardView = ({ organizations, contacts, onSelectOrg }) => {
    const stats = useMemo(() => {
      const orgCount = organizations.length;
      const contactCount = contacts.length;

      const nteeGroups = {};
      organizations.forEach((org) => {
        const desc = org.ntee_description || "Uncategorized";
        const code = org.ntee_code || "Unknown";
        if (!nteeGroups[desc]) {
          nteeGroups[desc] = { value: 0, code };
        }
        nteeGroups[desc].value += 1;
      });

      const typeGroups = {};
      organizations.forEach((org) => {
        const type = org.organization_type || "Unknown";
        typeGroups[type] = (typeGroups[type] || 0) + 1;
      });

      const nteeData = Object.entries(nteeGroups).map(([name, data]) => ({
        name: name.length > 30 ? name.substring(0, 27) + "..." : name,
        value: data.value,
        code: data.code,
      }));

      const typeData = Object.entries(typeGroups).map(([name, value]) => ({
        name: name.length > 20 ? name.substring(0, 17) + "..." : name,
        value,
      }));

      return { orgCount, contactCount, nteeData, typeData };
    }, [organizations, contacts]);

    const recentOrganizations = organizations.slice(0, 5);
    const recentContacts = contacts.slice(0, 5);

    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.orgCount}</div>
                  <p className="text-xs text-slate-500 mt-1">saved organizations</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                  <Users className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.contactCount}</div>
                  <p className="text-xs text-slate-500 mt-1">contacts found</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Organizations by NTEE Category</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{stats.nteeData.length} categories</p>
                </CardHeader>
                <CardContent>
                  {stats.nteeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={stats.nteeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          onClick={(entry) => {
                            setShowDashboard(false);
                            const newFilters = { ...filters, ntee_code: entry.code };
                            setFilters(newFilters);
                            const firstMatch = organizations.find(org => org.ntee_code?.toLowerCase().includes(entry.code.toLowerCase()));
                            if (firstMatch) setSelectedOrg(firstMatch);
                          }}
                        >
                          {stats.nteeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} organizations`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Organizations by Type</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{stats.typeData.length} types</p>
                </CardHeader>
                <CardContent>
                  {stats.typeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={stats.typeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          onClick={(entry) => {
                            setShowDashboard(false);
                            const newFilters = { ...filters, organization_type: entry.name };
                            setFilters(newFilters);
                            const firstMatch = organizations.find(org => org.organization_type?.toLowerCase().includes(entry.name.toLowerCase()));
                            if (firstMatch) setSelectedOrg(firstMatch);
                          }}
                        >
                          {stats.typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} organizations`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Items Row */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recently Saved Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentOrganizations.length > 0 ? (
                    <div className="space-y-3">
                      {recentOrganizations.map((org, index) => (
                        <motion.div
                          key={org.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                          className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => onSelectOrg(org)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {org.organization_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {org.city ? `${org.city}, ` : ""}{org.state}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No organizations yet</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recently Created Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentContacts.length > 0 ? (
                    <div className="space-y-3">
                      {recentContacts.map((contact, index) => (
                        <motion.div
                          key={contact.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.05 }}
                          className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {contact.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {contact.title || "No title"}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No contacts yet</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col overflow-hidden">
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-xl z-10 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696a507ebd3734abacaf302c/57bc5f9eb_Gemini_Generated_Image_an41ggan41ggan41.png" 
              alt="Dealorus" 
              className="h-12"
            />
            <div className="flex-1"></div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setShowDashboard(true);
                  setSelectedOrg(null);
                  setShowSearchPanel(false);
                }}
                variant="outline"
                className="hover:bg-slate-50"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button
                onClick={() => {
                  setShowSearchPanel(true);
                  setSelectedOrg(null);
                  setShowDashboard(false);
                }}
                style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: 'white' }}
                className="hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Search
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Column - Organizations List - Fixed */}
        <div className="w-80 border-r border-slate-100 bg-white flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-4 flex flex-col h-full overflow-hidden min-h-0">
            <div className="mb-4 space-y-3 flex-shrink-0">
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

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-100 rounded-full animate-spin" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
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
                        onClick={() => {
                          setSelectedOrg(org);
                          setShowDashboard(false);
                          setShowSearchPanel(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedOrg?.id === org.id
                            ? "bg-white"
                            : "border-slate-100 hover:border-slate-200 bg-white"
                        }`}
                        style={selectedOrg?.id === org.id ? { 
                          borderColor: 'hsl(217, 91%, 60%)', 
                          backgroundColor: 'hsl(214, 95%, 93%)' 
                        } : {}}
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

            <div className="mt-4 pt-4 border-t border-slate-100 flex-shrink-0">
              <p className="text-xs text-slate-400 text-center">
                {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Organization Details, Search Panel, or Dashboard */}
        <div className="flex-1 overflow-y-auto" ref={rightColumnRef}>
          {showDashboard ? (
            <DashboardView organizations={organizations} contacts={contacts} onSelectOrg={(org) => { setShowDashboard(false); setSelectedOrg(org); }} />
          ) : selectedOrg ? (
            <motion.div
              key={selectedOrg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6"
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
          ) : showSearchPanel ? (
            <SearchPanel
              onSearchComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["organizations"] });
                setShowSearchPanel(false);
              }}
              onClose={() => setShowSearchPanel(false)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Select an organization</p>
                <p className="text-sm mt-2">Choose from the list or start a new search</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}