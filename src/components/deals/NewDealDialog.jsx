import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import DealDialog from "@/components/deals/DealDialog";

export default function NewDealDialog({ open, onOpenChange, currentUser, organizations = [], lifecycleStages = [], onSaved }) {
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Deal.create(data),
    onSuccess: () => {
      toast.success("Deal created");
      onOpenChange(false);
      onSaved?.();
    },
  });

  const handleSubmit = (payload) => {
    const org = organizations.find(o => o.id === payload.organization_id);
    createMutation.mutate({
      ...payload,
      client_id: currentUser?.data?.client_id,
      organization_name: org?.organization_name || "",
      is_active: true,
    });
  };

  return (
    <DealDialog
      open={open}
      onOpenChange={onOpenChange}
      deal={null}
      lifecycleStages={lifecycleStages}
      organizations={organizations}
      onSubmit={handleSubmit}
      isPending={createMutation.isPending}
    />
  );
}