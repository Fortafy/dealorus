import React, { useCallback, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, ChevronRight, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ContactHeaderSummary from "@/components/people/ContactHeaderSummary";
import ContactDetailsSection from "@/components/people/ContactDetailsSection";
import ContactActivityTimelineSection from "@/components/people/ContactActivityTimelineSection";
import ContactQuickAddNoteDialog from "@/components/people/ContactQuickAddNoteDialog";
import EnrichContactDialog from "@/components/contacts/EnrichContactDialog";

export default function ContactDetailPanel({ contactId, onClose }) {
  const queryClient = useQueryClient();
  const [leftPct, setLeftPct] = useState(55);
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const [showEnrichDialog, setShowEnrichDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact-detail", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const results = await base44.entities.Contact.filter({ id: contactId });
      return results[0] || null;
    },
  });

  const { data: organization } = useQuery({
    queryKey: ["org-for-contact", contact?.organization_id],
    enabled: !!contact?.organization_id,
    queryFn: async () => {
      const results = await base44.entities.Organization.filter({ id: contact.organization_id });
      return results[0] || null;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-for-contact-panel"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  const clientId = currentUser?.client_id || currentUser?.data?.client_id;

  const { data: relatedOrganizations = [] } = useQuery({
    queryKey: ["related-organizations-for-contact", contactId, clientId, contact?.email, contact?.linkedin, contact?.name],
    enabled: !!contact && !!clientId,
    queryFn: async () => {
      const [allContacts, allOrganizations] = await Promise.all([
        base44.entities.Contact.filter({ client_id: clientId }, "-created_date"),
        base44.entities.Organization.filter({ client_id: clientId }, "organization_name"),
      ]);

      const email = contact.email?.trim().toLowerCase();
      const linkedin = contact.linkedin?.trim().toLowerCase();
      const name = contact.name?.trim().toLowerCase();

      const matchingContacts = allContacts.filter((item) => {
        const emailMatch = email && item.email?.trim().toLowerCase() === email;
        const linkedinMatch = linkedin && item.linkedin?.trim().toLowerCase() === linkedin;
        const nameMatch = !email && !linkedin && name && item.name?.trim().toLowerCase() === name;
        return item.id === contact.id || emailMatch || linkedinMatch || nameMatch;
      });

      const organizationIds = [...new Set(matchingContacts.map((item) => item.organization_id).filter(Boolean))];
      return allOrganizations.filter((item) => organizationIds.includes(item.id));
    },
  });

  const refreshContact = () => {
    queryClient.invalidateQueries({ queryKey: ["contact-detail", contactId] });
    queryClient.invalidateQueries({ queryKey: ["people"] });
    queryClient.invalidateQueries({ queryKey: ["activities", contactId] });
  };

  const handleDelete = async () => {
    await base44.entities.Contact.delete(contactId);
    queryClient.invalidateQueries({ queryKey: ["people"] });
    onClose();
  };

  const handleSyncToCRM = async () => {
    if (!organization) return;
    setIsSyncing(true);
    await base44.functions.invoke("pushToSalesforce", { organization_id: organization.id });
    queryClient.invalidateQueries({ queryKey: ["org-for-contact", contact.organization_id] });
    setIsSyncing(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
      </div>
    );
  }

  if (!contact) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-slate-100 px-4 py-2 text-sm text-slate-500">
        <button onClick={onClose} className="flex items-center gap-1.5 transition-colors hover:text-slate-800">
          <Users className="h-3.5 w-3.5" />
          <span>People</span>
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="truncate font-medium text-slate-800">{contact.name}</span>
      </div>

      <div ref={containerRef} className="flex flex-1 overflow-hidden bg-white">
        <div className="flex flex-col overflow-y-auto overflow-x-hidden" style={{ width: `${leftPct}%` }}>
          <div className="border-b border-slate-100">
            <ContactHeaderSummary
              contact={contact}
              organization={organization}
              onEnrich={() => setShowEnrichDialog(true)}
              onSync={handleSyncToCRM}
              onDelete={() => setShowDeleteConfirm(true)}
              onSaved={refreshContact}
              isSyncing={isSyncing}
            />
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-3">
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-400">Quick Add</span>
            <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-xs" onClick={() => setShowNoteDialog(true)} disabled={!organization || !clientId}>
              <StickyNote className="h-3 w-3" />Note
            </Button>
          </div>

          <div className="border-t border-slate-100">
            <ContactActivityTimelineSection contactId={contactId} contact={contact} />
          </div>
        </div>

        <div
          onMouseDown={handleDividerMouseDown}
          className="group flex w-1.5 flex-shrink-0 cursor-col-resize items-center justify-center bg-slate-100 transition-colors hover:bg-blue-200 active:bg-blue-300"
          title="Drag to resize"
        >
          <div className="h-8 w-0.5 rounded-full bg-slate-300 transition-colors group-hover:bg-blue-400" />
        </div>

        <div className="flex flex-col overflow-y-auto overflow-x-hidden" style={{ width: `${100 - leftPct}%` }}>
          <ContactDetailsSection contact={contact} organizations={relatedOrganizations} onSaved={refreshContact} />
        </div>
      </div>

      {organization && clientId ? (
        <ContactQuickAddNoteDialog
          open={showNoteDialog}
          onOpenChange={setShowNoteDialog}
          organization={organization}
          clientId={clientId}
          contactId={contact.id}
        />
      ) : null}

      <EnrichContactDialog
        open={showEnrichDialog}
        onOpenChange={setShowEnrichDialog}
        contact={contact}
        organization={organization || { organization_name: "", city: "", state: "", website: "" }}
        onSave={() => refreshContact()}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{contact.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}