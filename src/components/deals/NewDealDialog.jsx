import React from "react";
import DealEditorDialog from "@/components/deals/DealEditorDialog";

export default function NewDealDialog({ open, onOpenChange, currentUser, clientId, organizations = [], lifecycleStages = [], onSaved }) {
  return (
    <DealEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      clientId={clientId || currentUser?.data?.client_id || currentUser?.client_id}
      organizations={organizations}
      lifecycleStages={lifecycleStages}
      onSaved={onSaved}
    />
  );
}