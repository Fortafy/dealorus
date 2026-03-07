import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import DashboardNav from "@/components/dashboard/DashboardNav";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import OrganizationSettings from "@/components/dashboard/OrganizationSettings";
import BrandingSettings from "@/components/dashboard/BrandingSettings";
import SubscriptionDetails from "@/components/dashboard/SubscriptionDetails";
import PersonalProfileSection from "@/components/dashboard/PersonalProfileSection";
import PersonalSettingsSection from "@/components/dashboard/PersonalSettingsSection";
import AdminOrganizations from "@/components/dashboard/AdminOrganizations.jsx";
import AdminUsers from "@/components/dashboard/AdminUsers";
import OrganizationMembers from "@/components/organizations/OrganizationMembers";
import DataSourceConfiguration from "@/components/dashboard/DataSourceConfiguration";
import DuplicatesReview from "@/components/organizations/DuplicatesReview";
import SalesforceFieldMappingSection from "@/components/dashboard/SalesforceFieldMappingSection";
import { Home, HelpCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { isOrgAdmin } from "@/components/utils/roleChecking";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSection, setActiveSection] = useState("profile");
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
      case "profile":
        return <PersonalProfileSection user={currentUser} />;
      case "settings":
        return <PersonalSettingsSection user={currentUser} />;
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
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-xl z-10 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <img 
            src={organization?.logo_url || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696a507ebd3734abacaf302c/57bc5f9eb_Gemini_Generated_Image_an41ggan41ggan41.png"}
            alt="Organization"
            className="h-10"
          />
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Organizations")} title="Home">
              <Home className="w-5 h-5 text-slate-600 hover:text-slate-900 transition-colors" />
            </Link>
            <button title="Support" className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <HelpCircle className="w-5 h-5 text-slate-600 hover:text-slate-900" />
            </button>
            <Link to={createPageUrl("Dashboard")} title="User Profile">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-white text-xs font-semibold" style={{ backgroundColor: 'hsl(39, 100%, 50%)' }}>
                  {currentUser?.full_name?.split(" ").map(n => n[0]).join("") || "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Column - Navigation */}
        <div className="w-72 border-r border-slate-100 bg-white flex flex-col flex-shrink-0 overflow-hidden">
          <DashboardNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isAdmin={isOrgAdmin(currentUser)}
            isBaseAdmin={currentUser?.role === "admin"}
            organization={organization}
            currentUser={currentUser}
          />
        </div>

        {/* Right Column - Content */}
        <div className="flex-1 overflow-y-auto">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </main>
    </div>
  );
}