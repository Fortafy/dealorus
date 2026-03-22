import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, KeyRound, Loader2, Pencil, Trash2 } from "lucide-react";

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
  isSaving,
  isToggling,
  isDeleting,
}) {
  const [isEditing, setIsEditing] = useState(!integration);
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
      <CardHeader className="settings-card-header">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="settings-card-title flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {service.display_name}
            </CardTitle>
            <CardDescription className="settings-card-description mt-1">
              {service.description}
            </CardDescription>
          </div>
          <Badge variant={integration?.is_active ? "default" : "outline"}>{statusLabel}</Badge>
        </div>
      </CardHeader>

      <CardContent className="settings-card-body space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium text-slate-700">Key status</p>
              <p className="mt-1 font-mono text-xs text-slate-900">
                {integration ? maskKey(integration.api_key) : "No API key saved yet"}
              </p>
            </div>
            <a
              href={service.help_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              {service.help_label}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="settings-label">{integration ? "Replace API key" : "API key"}</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={`Paste your ${service.display_name} key`}
                className="settings-input"
              />
              <p className="settings-helper">Only client administrators can view and manage these keys.</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleSave} disabled={!apiKey.trim() || isSaving} className="settings-primary-button">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : integration ? "Update Key" : "Save Key"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving} className="settings-secondary-button">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button variant="outline" onClick={() => setIsEditing(true)} className="settings-secondary-button">
              <Pencil className="h-4 w-4" />
              Replace Key
            </Button>
            <Button variant="outline" onClick={() => onToggle(integration)} disabled={isToggling} className="settings-secondary-button">
              {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : integration?.is_active ? "Disable" : "Enable"}
            </Button>
            <Button variant="destructive" onClick={() => onDelete(integration)} disabled={isDeleting} className="settings-secondary-button">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}