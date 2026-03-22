import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader, CheckCircle2, AlertCircle, Trash2, Plus, GripVertical } from "lucide-react";
import { motion } from "framer-motion";

export default function LifecycleStageSettings({ organization }) {
  const [stages, setStages] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (organization?.lifecycle_stages) {
      setStages([...organization.lifecycle_stages].sort((a, b) => a.order - b.order));
    }
  }, [organization]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Client.update(organization.id, {
        lifecycle_stages: stages,
      });
    },
    onSuccess: () => {
      setSuccess("Lifecycle stages updated successfully");
      queryClient.invalidateQueries({ queryKey: ["client"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err.message || "Failed to update lifecycle stages");
      setTimeout(() => setError(null), 3000);
    },
  });

  const handleStageName = (index, name) => {
    const updated = [...stages];
    updated[index].name = name;
    setStages(updated);
  };

  const handleAddStage = () => {
    const newStage = {
      id: `stage_${Date.now()}`,
      name: "New Stage",
      order: Math.max(...stages.map(s => s.order), 0) + 1,
    };
    setStages([...stages, newStage]);
  };

  const handleRemoveStage = (index) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleMoveStage = (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === stages.length - 1) return;

    const updated = [...stages];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    // Update order numbers
    updated.forEach((stage, i) => {
      stage.order = i + 1;
    });
    setStages(updated);
  };

  const handleSave = () => {
    if (stages.length === 0) {
      setError("At least one lifecycle stage is required");
      return;
    }

    const hasEmptyNames = stages.some(s => !s.name.trim());
    if (hasEmptyNames) {
      setError("All stages must have a name");
      return;
    }

    updateMutation.mutate();
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="settings-card">
        <CardHeader className="settings-card-header">
          <CardTitle className="settings-card-title">Lifecycle Stages</CardTitle>
          <p className="settings-card-description">
            Customize the stages your team will use to track organizations through the pipeline
          </p>
        </CardHeader>
        <CardContent className="settings-card-body">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {stages.map((stage, index) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-500 min-w-fit w-6 text-center">
                    {index + 1}
                  </span>
                </div>

                <Input
                  value={stage.name}
                  onChange={(e) => handleStageName(index, e.target.value)}
                  placeholder="Stage name"
                  className="settings-input flex-1"
                />

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveStage(index, "up")}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveStage(index, "down")}
                    disabled={index === stages.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    ↓
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStage(index)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleAddStage}
            className="settings-secondary-button w-full mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Button>

          <div className="settings-actions gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                if (organization?.lifecycle_stages) {
                  setStages([...organization.lifecycle_stages].sort((a, b) => a.order - b.order));
                }
              }}
              disabled={updateMutation.isPending}
              className="settings-secondary-button"
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="settings-primary-button"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Stages"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}