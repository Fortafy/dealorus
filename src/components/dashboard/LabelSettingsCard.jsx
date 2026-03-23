import React, { useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LabelBadge from "@/components/labels/LabelBadge";
import CompactLabelScopeSelector, { ALL_LABEL_OBJECTS } from "@/components/dashboard/CompactLabelScopeSelector";

const DEFAULT_COLOR = "#7c3aed";

export default function LabelSettingsCard({ clientId }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [newApplicableObjects, setNewApplicableObjects] = useState(ALL_LABEL_OBJECTS);
  const [drafts, setDrafts] = useState({});

  const { data: labels = [] } = useQuery({
    queryKey: ["labels", clientId],
    enabled: !!clientId,
    queryFn: () => base44.entities.Label.filter({ client_id: clientId }, "name"),
  });

  useEffect(() => {
    setDrafts((current) => {
      const next = Object.fromEntries(
        labels.map((label) => [label.id, {
          name: label.name || "",
          color: label.color || DEFAULT_COLOR,
          applicable_objects: Array.isArray(label.applicable_objects) && label.applicable_objects.length
            ? label.applicable_objects
            : ALL_LABEL_OBJECTS,
        }])
      );

      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      const hasChanged = currentKeys.length !== nextKeys.length || nextKeys.some((key) => {
        const currentDraft = current[key];
        const nextDraft = next[key];

        return !currentDraft
          || currentDraft.name !== nextDraft.name
          || currentDraft.color !== nextDraft.color
          || JSON.stringify(currentDraft.applicable_objects || []) !== JSON.stringify(nextDraft.applicable_objects || []);
      });

      return hasChanged ? next : current;
    });
  }, [labels]);

  const createLabelMutation = useMutation({
    mutationFn: () => base44.entities.Label.create({
      client_id: clientId,
      name: newName.trim(),
      color: newColor,
      applicable_objects: newApplicableObjects,
    }),
    onSuccess: () => {
      setNewName("");
      setNewColor(DEFAULT_COLOR);
      setNewApplicableObjects(ALL_LABEL_OBJECTS);
      queryClient.invalidateQueries({ queryKey: ["labels", clientId] });
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Label.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", clientId] });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (id) => base44.entities.Label.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", clientId] });
    },
  });

  return (
    <Card className="settings-card">
      <CardContent className="settings-card-body pt-6">
        <div className="settings-section-header">
          <h3 className="settings-card-title">Labels</h3>
          <p className="settings-card-description">Create and manage the fixed labels your team can apply to contacts, organizations, and deals.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600">New label</span>
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Primary, VIP, High Priority"
              className="h-9 min-w-[180px] flex-1 text-xs"
            />
            <Input
              type="color"
              value={newColor}
              onChange={(event) => setNewColor(event.target.value)}
              className="h-9 w-11 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              aria-label="Label color"
            />
            <CompactLabelScopeSelector value={newApplicableObjects} onChange={setNewApplicableObjects} className="flex-1" />
            <Button
              onClick={() => newName.trim() && createLabelMutation.mutate()}
              disabled={!newName.trim() || newApplicableObjects.length === 0 || createLabelMutation.isPending}
              size="icon"
              className="h-9 w-9 shrink-0"
              title="Add label"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {labels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              No labels created yet.
            </div>
          ) : (
            labels.map((label) => {
              const draft = drafts[label.id] || {
                name: label.name || "",
                color: label.color || DEFAULT_COLOR,
                applicable_objects: Array.isArray(label.applicable_objects) && label.applicable_objects.length
                  ? label.applicable_objects
                  : ALL_LABEL_OBJECTS,
              };

              return (
                <div key={label.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <LabelBadge label={{ name: draft.name || label.name, color: draft.color || label.color }} />
                    <Input
                      value={draft.name}
                      onChange={(event) => setDrafts((current) => ({ ...current, [label.id]: { ...draft, name: event.target.value } }))}
                      className="h-8 min-w-[160px] flex-1 text-xs"
                    />
                    <Input
                      type="color"
                      value={draft.color}
                      onChange={(event) => setDrafts((current) => ({ ...current, [label.id]: { ...draft, color: event.target.value } }))}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                      aria-label="Label color"
                    />
                    <CompactLabelScopeSelector
                      value={draft.applicable_objects}
                      onChange={(applicableObjects) => setDrafts((current) => ({
                        ...current,
                        [label.id]: { ...draft, applicable_objects: applicableObjects },
                      }))}
                      className="flex-1"
                    />
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateLabelMutation.mutate({
                          id: label.id,
                          data: {
                            name: draft.name.trim(),
                            color: draft.color,
                            applicable_objects: draft.applicable_objects,
                          },
                        })}
                        disabled={!draft.name.trim() || draft.applicable_objects.length === 0 || updateLabelMutation.isPending}
                        className="h-8 w-8 text-slate-600"
                        title="Save label"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-600"
                        onClick={() => deleteLabelMutation.mutate(label.id)}
                        disabled={deleteLabelMutation.isPending}
                        title="Delete label"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}