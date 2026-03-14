import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import OrganizationSummary from "@/components/organizations/OrganizationSummary";
import ContactsPanel from "@/components/organizations/ContactsPanel";
import NotesSection from "@/components/organizations/NotesSection";
import DealsSection from "@/components/organizations/DealsSection";
import ActivityTimeline from "@/components/organizations/ActivityTimeline";
import DataInsightsPanel from "@/components/organizations/DataInsightsPanel";

export default function OrganizationDetailView({ organizationId, onClose }) {

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

      {/* Sections */}
       <div className="space-y-4">
         <ContactsPanel organization={organization} clientId={currentUser?.client_id} />
         <NotesSection organization={organization} clientId={currentUser?.client_id} />
         <DealsSection
           organization={organization}
           clientId={currentUser?.client_id}
           clientLifecycleStages={clientData?.lifecycle_stages || []}
         />
         <ActivityTimeline organization={organization} />
         <DataInsightsPanel organization={organization} />
       </div>
    </motion.div>
  );
}