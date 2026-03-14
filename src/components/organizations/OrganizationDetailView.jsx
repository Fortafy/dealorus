import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Users, FileText, DollarSign, Activity, Link2 } from "lucide-react";
import OrganizationSummary from "@/components/organizations/OrganizationSummary";
import ContactsPanel from "@/components/organizations/ContactsPanel";
import NotesSection from "@/components/organizations/NotesSection";
import DealsSection from "@/components/organizations/DealsSection";
import ActivityTimeline from "@/components/organizations/ActivityTimeline";
import DataInsightsPanel from "@/components/organizations/DataInsightsPanel";

export default function OrganizationDetailView({ organizationId, onClose }) {
  const [collapsedSections, setCollapsedSections] = useState({
    contacts: false,
    notes: false,
    deals: false,
    activity: false,
    insights: false,
  });

  const { data: organization, isLoading, error } = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: async () => {
      const results = await base44.entities.Organization.filter({ id: organizationId });
      return results[0] || null;
    },
    enabled: !!organizationId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  const { data: clientData } = useQuery({
    queryKey: ["client", currentUser?.client_id],
    queryFn: async () => {
      if (!currentUser?.client_id) return null;
      const results = await base44.entities.Client.filter({ id: currentUser.client_id });
      return results[0] || null;
    },
    enabled: !!currentUser?.client_id,
  });

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!organization || error) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p>Organization not found</p>
      </div>
    );
  }

  const iconMap = {
    contacts: Users,
    notes: FileText,
    deals: DollarSign,
    activity: Activity,
    insights: Link2,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-6"
    >
      {/* Always visible sections */}
      <OrganizationSummary
        organization={organization}
        onDelete={onClose}
        onEdit={(updatedOrg) => {
          // Invalidate and refetch
        }}
        isSaved={true}
        clientInstanceUrl={clientData?.salesforce_instance_url}
      />

      {/* Collapsible sections */}
      <div className="space-y-4">
        {[
          { section: "contacts", title: "Contacts", Icon: Users, component: ContactsPanel },
          { section: "notes", title: "Notes", Icon: FileText, component: NotesSection },
          { section: "deals", title: "Deals", Icon: DollarSign, component: DealsSection },
          { section: "activity", title: "Activity", Icon: Activity, component: ActivityTimeline },
          { section: "insights", title: "Data Insights", Icon: Link2, component: DataInsightsPanel },
        ].map(({ section, title, Icon, component: Component }) => (
          <section key={section}>
            <button
              onClick={() => toggleSection(section)}
              className="flex items-center justify-between w-full group hover:opacity-80 transition-opacity mb-3 px-1"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="font-semibold text-sm">{title}</span>
              </div>
              {collapsedSections[section] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
            </button>
            {!collapsedSections[section] && (
              <div>
                {section === "contacts" && <ContactsPanel organization={organization} clientId={currentUser?.client_id} />}
                {section === "notes" && <NotesSection organization={organization} clientId={currentUser?.client_id} />}
                {section === "deals" && (
                  <DealsSection
                    organization={organization}
                    clientId={currentUser?.client_id}
                    clientLifecycleStages={clientData?.lifecycle_stages || []}
                  />
                )}
                {section === "activity" && <ActivityTimeline organization={organization} />}
                {section === "insights" && <DataInsightsPanel organization={organization} />}
              </div>
            )}
          </section>
        ))}
      </div>
    </motion.div>
  );
}