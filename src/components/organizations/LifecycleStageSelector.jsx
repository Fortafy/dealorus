import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function LifecycleStageSelector({ organizationId, clientId, currentStageId, onStageChange }) {
  const [clientStages, setClientStages] = useState([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadClientStages();
  }, [clientId]);

  const loadClientStages = async () => {
    try {
      setIsLoadingStages(true);
      const client = await base44.entities.Client.get(clientId);
      setClientStages(client.lifecycle_stages || []);
    } catch (error) {
      console.error('Error loading client stages:', error);
    } finally {
      setIsLoadingStages(false);
    }
  };

  const handleStageChange = async (newStageId) => {
    setIsUpdating(true);
    try {
      await base44.entities.Organization.update(organizationId, {
        lifecycle_stage: newStageId
      });
      onStageChange?.(newStageId);
    } catch (error) {
      console.error('Error updating lifecycle stage:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStageName = clientStages.find(s => s.id === currentStageId)?.name || 'Set stage';

  return (
    <Select value={currentStageId || ""} onValueChange={handleStageChange} disabled={isLoadingStages || isUpdating}>
      <SelectTrigger className="w-full border-0 bg-slate-50 hover:bg-slate-100">
        <SelectValue placeholder="Select stage" />
      </SelectTrigger>
      <SelectContent>
        {clientStages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            {stage.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}