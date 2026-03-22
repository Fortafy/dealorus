import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import DashboardNav from "@/components/dashboard/DashboardNav";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import OrganizationSettings from "@/components/dashboard/OrganizationSettings";
import BrandingSettings from "@/components/dashboard/BrandingSettings";
import SubscriptionDetails from "@/components/dashboard/SubscriptionDetails";
import PreferencesSection from "@/components/dashboard/PreferencesSection";
import AdminOrganizations from "@/components/dashboard/AdminOrganizations.jsx";
import AdminUsers from "@/components/dashboard/AdminUsers";
import OrganizationMembers from "@/components/organizations/OrganizationMembers";
import DataSourceConfiguration from "@/components/dashboard/DataSourceConfiguration";
import DuplicatesReview from "@/components/organizations/DuplicatesReview";
import SalesforceFieldMappingSection from "@/components/dashboard/SalesforceFieldMappingSection";
import { Home } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { isOrgAdmin } from "@/components/utils/roleChecking";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";


export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSection, setActiveSection] = useState("preferences");
  const queryClient = useQueryClient();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };
    fetchUser();
  }, []);

  const { data: organization } = useQuery({
    queryKey: ["client", currentUser?.client_id],
    enabled: !!currentUser?.client_id,
    queryFn: () => base44.entities.Client.filter({ id: currentUser.client_id }).then(clients => clients[0]),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["client-users", currentUser?.client_id],
    enabled: !!currentUser?.client_id && isOrgAdmin(currentUser),
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.client_id === currentUser.client_id);
    },
  });

  const renderContent = () => {
    switch (activeSection) {
      case "preferences":
        return <PreferencesSection user={currentUser} />;
      case "admin-users":
        return currentUser?.role === "admin" ? <AdminUsers /> : null;
      case "admin-organizations":
        return currentUser?.role === "admin" ? <AdminOrganizations /> : null;
      case "metrics":
        return isOrgAdmin(currentUser) ? (
          <DashboardMetrics organization={organization} users={users} />
        ) : null;
      case "organization-members":
        return isOrgAdmin(currentUser) ? (
          <OrganizationMembers organizationId={currentUser.client_id} />
        ) : null;
      case "organization-settings":
        return isOrgAdmin(currentUser) ? (
          <OrganizationSettings organization={organization} />
        ) : null;
      case "branding":
        return isOrgAdmin(currentUser) ? (
          <BrandingSettings organization={organization} />
        ) : null;
      case "subscription":
        return isOrgAdmin(currentUser) ? (
          <SubscriptionDetails organization={organization} currentUser={currentUser} />
        ) : null;
      case "data-sources":
        return isOrgAdmin(currentUser) ? (
          <DataSourceConfiguration organization={organization} />
        ) : null;
      case "sf-field-mapping":
        return isOrgAdmin(currentUser) ? (
          <SalesforceFieldMappingSection organization={organization} />
        ) : null;
      case "find-duplicates":
        return isOrgAdmin(currentUser) ? (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Duplicate Organizations</h2>
            <DuplicatesReview
              clientId={currentUser?.client_id}
              onComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["organizations"] });
                setActiveSection("metrics");
              }}
            />
          </div>
        ) : null;
      default:
        return null;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-100 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'hsl(39, 100%, 50%)' }} />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Left Sidebar - Dashboard Nav */}
      <aside className="w-56 flex-shrink-0 h-screen bg-white border-r border-slate-100 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="h-9 w-full overflow-hidden">
            <img
              src={organization?.logo_url || "https://media.base44.com/images/public/696a507ebd3734abacaf302c/f8cae25b6_Gemini_Generated_Image_c7byx4c7byx4c7by1.png"}
              alt="Dealorus"
              className="h-full w-full object-cover"
              style={{ objectPosition: "center 42%" }}
            />
          </div>
        </div>

        {/* Dashboard Nav */}
        <div className="flex-1 overflow-y-auto">
          <DashboardNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isAdmin={isOrgAdmin(currentUser)}
            isBaseAdmin={currentUser?.role === "admin"}
            organization={organization}
            currentUser={currentUser}
          />
        </div>

        {/* Back to App */}
        <div className="border-t border-slate-100 py-4 flex-shrink-0">
          <Link
            to={createPageUrl("Organizations")}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Right Content Area */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </main>
    </div>
  );
}