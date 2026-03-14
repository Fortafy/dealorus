import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronRight } from "lucide-react";

export default function LifecyclePath({ clientId, currentStageId, organizationId, onStageChange }) {
  const [stages, setStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStages();
  }, [clientId]);

  const loadStages = async () => {
    try {
      setIsLoading(true);
      const client = await base44.entities.Client.get(clientId);
      const sortedStages = (client.lifecycle_stages || []).sort((a, b) => a.order - b.order);
      setStages(sortedStages);
    } catch (error) {
      console.error('Error loading stages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || stages.length === 0) return null;

  const currentStageIndex = stages.findIndex(s => s.id === currentStageId);

  const handleStageClick = async (stageId) => {
    try {
      await base44.entities.Organization.update(organizationId, {
        lifecycle_stage: stageId
      });
      onStageChange?.(stageId);
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  return (
    <div className="mb-6 px-6">
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div
              onClick={() => handleStageClick(stage.id)}
              className={`flex-1 py-3 px-4 rounded-lg text-center text-sm font-medium cursor-pointer transition-all ${
                currentStageIndex === index
                  ? 'bg-blue-600 text-white shadow-lg'
                  : currentStageIndex > index
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {stage.name}
            </div>
            {index < stages.length - 1 && (
              <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                currentStageIndex > index ? 'text-blue-600' : 'text-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}