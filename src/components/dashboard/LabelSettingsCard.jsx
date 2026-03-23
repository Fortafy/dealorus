import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LabelBadge from "@/components/labels/LabelBadge";

const DEFAULT_COLOR = "#7c3aed";

export default function LabelSettingsCard({ clientId }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [drafts, setDrafts] = useState({});

  const { data: labels = [] } = useQuery({
    queryKey: ["labels", clientId],
    enabled: !!clientId,
    queryFn: () => base44.entities.Label.filter({ client_id: clientId }, "name"),
  });

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        labels.map((label) => [label.id, { name: label.name || "", color: label.color || DEFAULT_COLOR }])
      )
    );
  }, [labels]);

  const createLabelMutation = useMutation({
    mutationFn: () => base44.entities.Label.create({ client_id: clientId, name: newName.trim(), color: newColor }),
    onSuccess: () => {
      setNewName("");
      setNewColor(DEFAULT_COLOR);
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

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end">
            <div>
              <label className="settings-label">Label name</label>
              <Input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Primary, VIP, High Priority"
                className="settings-input"
              />
            </div>
            <div>
              <label className="settings-label">Color</label>
              <Input
                type="color"
                value={newColor}
                onChange={(event) => setNewColor(event.target.value)}
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
              />
            </div>
            <Button
              onClick={() => newName.trim() && createLabelMutation.mutate()}
              disabled={!newName.trim() || createLabelMutation.isPending}
              className="h-11"
            >
              {createLabelMutation.isPending ? "Adding..." : "Add Label"}
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
              const draft = drafts[label.id] || { name: label.name || "", color: label.color || DEFAULT_COLOR };

              return (
                <div key={label.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <LabelBadge label={{ name: draft.name || label.name, color: draft.color || label.color }} />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateLabelMutation.mutate({ id: label.id, data: { name: draft.name.trim(), color: draft.color } })}
                        disabled={!draft.name.trim() || updateLabelMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-600"
                        onClick={() => deleteLabelMutation.mutate(label.id)}
                        disabled={deleteLabelMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                    <Input
                      value={draft.name}
                      onChange={(event) => setDrafts((current) => ({ ...current, [label.id]: { ...draft, name: event.target.value } }))}
                      className="settings-input"
                    />
                    <Input
                      type="color"
                      value={draft.color}
                      onChange={(event) => setDrafts((current) => ({ ...current, [label.id]: { ...draft, color: event.target.value } }))}
                      className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                    />
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