import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Pencil, Trash2 } from "lucide-react";

function maskKey(value) {
  if (!value) return "Not saved";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}

export default function ClientIntegrationKeyCard({
  service,
  integration,
  onSave,
  onToggle,
  onDelete,
  onTest,
  isSaving,
  isToggling,
  isDeleting,
  isTesting
}) {
  const requiresKey = service.requires_key !== false;
  const [isEditing, setIsEditing] = useState(requiresKey && !integration);
  const [apiKey, setApiKey] = useState("");

  const statusLabel = useMemo(() => {
    if (!integration) return "Not Connected";
    return integration.is_active ? "Active" : "Inactive";
  }, [integration]);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    await onSave(service, apiKey.trim(), integration);
    setApiKey("");
    setIsEditing(false);
  };

  const handleCancel = () => {
    setApiKey("");
    setIsEditing(!integration);
  };

  return (
    <Card className="settings-card">
      <CardContent className="settings-card-body pt-6">
        <div className="settings-row-responsive">
          <div className="settings-text-block">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="settings-card-title">{service.display_name}</h3>
              {requiresKey && <Badge variant={integration?.is_active ? "default" : "outline"}>{statusLabel}</Badge>}
            </div>
            <p className="settings-card-description">{service.description}</p>
          </div>

          <Button asChild variant="outline" className="settings-secondary-button">
            <a href={service.help_url} target="_blank" rel="noopener noreferrer">
              {service.help_label}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        <div className="space-y-4 pt-4">
          {requiresKey && (
            <div>
              <label className="settings-label">Key Status</label>
              <Input
                value={integration ? maskKey(integration.api_key) : "No API key saved yet"}
                disabled
                className="settings-input-disabled settings-input-mono"
              />
            </div>
          )}

          {requiresKey && isEditing ? (
            <>
              <div>
                <label className="settings-label flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-slate-700" />
                  <span>{integration ? "Replace API key" : "API key"}</span>
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={`Paste your ${service.display_name} key`}
                  className="settings-input"
                />
              </div>

              <div className="settings-actions">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving} className="settings-secondary-button">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!apiKey.trim() || isSaving} className="settings-primary-button">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : integration ? "Update Key" : "Save Key"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="settings-actions">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button variant="outline" onClick={() => onTest(service)} disabled={isTesting} className="settings-secondary-button">
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Test Connection
                </Button>
                {requiresKey && (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(true)} className="settings-secondary-button">
                      <Pencil className="h-4 w-4" />
                      Replace Key
                    </Button>
                    <Button variant="outline" onClick={() => onToggle(integration)} disabled={isToggling || !integration} className="settings-secondary-button">
                      {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : integration?.is_active ? "Disable" : "Enable"}
                    </Button>
                  </>
                )}
                {integration && (
                  <Button variant="destructive" onClick={() => onDelete(integration)} disabled={isDeleting} className="settings-secondary-button">
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Remove
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>);

}