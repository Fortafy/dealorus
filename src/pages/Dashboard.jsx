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
import { Home } from "lucide-react";
import { motion } from "framer-motion";
import { isOrgAdmin } from "@/components/utils/roleChecking";

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSection, setActiveSection] = useState("profile");

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
    queryKey: ["organization", currentUser?.organization_id],
    enabled: !!currentUser?.organization_id,
    queryFn: () => base44.entities.Organization.filter({ id: currentUser.organization_id }).then(orgs => orgs[0]),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["organization-users", currentUser?.organization_id],
    enabled: !!currentUser?.organization_id && isOrgAdmin(currentUser),
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.organization_id === currentUser.organization_id);
    },
  });

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <PersonalProfileSection user={currentUser} />;
      case "settings":
        return <PersonalSettingsSection user={currentUser} />;
      case "metrics":
        return isOrgAdmin(currentUser) ? (
          <DashboardMetrics organization={organization} users={users} />
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
          <SubscriptionDetails organization={organization} />
        ) : null;
      default:
        return null;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-xl z-10 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <img 
              src={organization?.logo_url || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696a507ebd3734abacaf302c/57bc5f9eb_Gemini_Generated_Image_an41ggan41ggan41.png"}
              alt="Organization"
              className="h-12"
            />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {organization?.name || "Dashboard"}
              </h1>
              <p className="text-xs text-slate-500">{activeSection.replace(/-/g, " ").toUpperCase()}</p>
            </div>
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