import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import DealDialog from "@/components/deals/DealDialog";
import { applyClosedStageRules } from "@/components/deals/dealStageUtils";

export default function DealEditorDialog({
  open,
  onOpenChange,
  deal = null,
  clientId,
  organization,
  organizations,
  lifecycleStages = [],
  onSaved,
}) {
  const resolvedClientId = clientId || organization?.client_id || deal?.client_id || null;
  const resolvedOrganizations = organization ? undefined : organizations;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Deal.create(data),
    onSuccess: () => {
      toast.success("Deal created");
      onOpenChange(false);
      onSaved?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      toast.success("Deal updated");
      onOpenChange(false);
      onSaved?.();
    },
  });

  const handleSubmit = (payload, dealId) => {
    if (dealId) {
      updateMutation.mutate({
        id: dealId,
        data: applyClosedStageRules({
          payload,
          nextStage: payload.stage,
          previousStage: deal?.stage,
          lifecycleStages,
        }),
      });
      return;
    }

    const selectedOrganization = organization || organizations?.find((item) => item.id === payload.organization_id);

    createMutation.mutate(applyClosedStageRules({
      payload: {
        ...payload,
        client_id: resolvedClientId,
        organization_id: selectedOrganization?.id || payload.organization_id,
        organization_name: selectedOrganization?.organization_name || "",
        is_active: true,
      },
      nextStage: payload.stage,
      lifecycleStages,
    }));
  };

  return (
    <DealDialog
      open={open}
      onOpenChange={onOpenChange}
      deal={deal}
      lifecycleStages={lifecycleStages}
      organizations={resolvedOrganizations}
      onSubmit={handleSubmit}
      isPending={createMutation.isPending || updateMutation.isPending}
      clientId={resolvedClientId}
    />
  );
}