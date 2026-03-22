import React, { useState, useRef, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, ChevronRight, StickyNote, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

import OrganizationSummary, { OrganizationFields } from "@/components/organizations/OrganizationSummary";
import ContactsPanel from "@/components/organizations/ContactsPanel";
import DealsSection from "@/components/organizations/DealsSection";
import ActivityTimeline from "@/components/organizations/ActivityTimeline";

export default function OrganizationDetailView({ organizationId, onClose }) {
  const queryClient = useQueryClient();

  // Resizable panel state — left column width as percentage
  const [leftPct, setLeftPct] = useState(55);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (moveEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(Math.max(pct, 25), 75));
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

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
      try { return await base44.auth.me(); } catch { return null; }
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

  // Expose callbacks for quick-add buttons to trigger child components
  const [triggerNote, setTriggerNote] = useState(0);
  const [triggerDeal, setTriggerDeal] = useState(0);

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Breadcrumb header */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 flex-shrink-0 text-sm text-slate-500">
        <button onClick={onClose} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
          <Building2 className="w-3.5 h-3.5" />
          <span>Organizations</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-800 font-medium truncate">{organization.organization_name}</span>
      </div>

      {/* Two-column resizable layout */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {/* Left column — org fields + quick add + timeline */}
        <div
          className="flex flex-col overflow-y-auto overflow-x-hidden"
          style={{ width: `${leftPct}%` }}
        >
          {/* Org header — full width */}
          <div className="border-b border-slate-100">
            <OrganizationSummary
              organization={organization}
              onDelete={onClose}
              onEdit={() => {
                queryClient.invalidateQueries({ queryKey: ["organization", organizationId] });
                queryClient.invalidateQueries({ queryKey: ["organizations"] });
              }}
              isSaved={true}
              clientInstanceUrl={clientData?.salesforce_instance_url}
            />
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-100 flex-shrink-0">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide mr-1">Quick Add</span>
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1" onClick={() => setTriggerNote(n => n + 1)}>
              <StickyNote className="w-3 h-3" />Note
            </Button>
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1" onClick={() => setTriggerDeal(n => n + 1)}>
              <Handshake className="w-3 h-3" />Deal
            </Button>
          </div>

          {/* Activity Timeline — full width */}
          <div className="border-t border-slate-100">
            <ActivityTimeline organization={organization} />
          </div>
        </div>

        {/* Resizable divider */}
        <div
          onMouseDown={handleDividerMouseDown}
          className="w-1.5 flex-shrink-0 bg-slate-100 hover:bg-blue-200 active:bg-blue-300 cursor-col-resize transition-colors flex items-center justify-center group"
          title="Drag to resize"
        >
          <div className="w-0.5 h-8 bg-slate-300 group-hover:bg-blue-400 rounded-full transition-colors" />
        </div>

        {/* Right column — org fields, contacts, notes, deals */}
        <div
          className="flex flex-col overflow-y-auto overflow-x-hidden"
          style={{ width: `${100 - leftPct}%` }}
        >
          {/* Organization Fields */}
          <div className="border-b border-slate-100">
            <OrganizationFields
              organization={organization}
              isSaved={true}
              clientInstanceUrl={clientData?.salesforce_instance_url}
              onEdit={() => {
                queryClient.invalidateQueries({ queryKey: ["organization", organizationId] });
                queryClient.invalidateQueries({ queryKey: ["organizations"] });
              }}
            />
          </div>

          <div className="space-y-0 border-t border-slate-100">
            <ContactsPanel
              organization={organization}
              clientId={currentUser?.client_id}
            />
            <NotesSectionWithTrigger
              organization={organization}
              clientId={currentUser?.client_id}
              externalTrigger={triggerNote}
            />
            <DealsSectionWithTrigger
              organization={organization}
              clientId={currentUser?.client_id}
              clientLifecycleStages={clientData?.lifecycle_stages || []}
              externalTrigger={triggerDeal}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Wrapper that opens NotesSection's create form when externalTrigger increments
function NotesSectionWithTrigger({ organization, clientId, externalTrigger }) {
  const [openCreate, setOpenCreate] = useState(0);

  React.useEffect(() => {
    if (externalTrigger > 0) setOpenCreate(n => n + 1);
  }, [externalTrigger]);

  return <NotesSection organization={organization} clientId={clientId} externalOpenCreate={openCreate} />;
}

// Wrapper that opens DealsSection's create form when externalTrigger increments
function DealsSectionWithTrigger({ organization, clientId, clientLifecycleStages, externalTrigger }) {
  const [openCreate, setOpenCreate] = useState(0);

  React.useEffect(() => {
    if (externalTrigger > 0) setOpenCreate(n => n + 1);
  }, [externalTrigger]);

  return (
    <DealsSection
      organization={organization}
      clientId={clientId}
      clientLifecycleStages={clientLifecycleStages}
      externalOpenCreate={openCreate}
    />
  );
}