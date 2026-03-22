import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader, Upload, Download, ExternalLink } from "lucide-react";

export default function SalesforceIntegration({ organization }) {
  const [instanceUrl, setInstanceUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const queryClient = useQueryClient();

  const isConnected = organization?.salesforce_connected;

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('connectSalesforceExternalClient', {
        instance_url: instanceUrl,
        consumer_key: consumerKey,
        consumer_secret: consumerSecret
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSuccess("Salesforce External Client App connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setInstanceUrl("");
      setConsumerKey("");
      setConsumerSecret("");
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err.response?.data?.error || err.message || "Failed to connect Salesforce");
      setTimeout(() => setError(null), 5000);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Client.update(organization.id, {
        salesforce_connected: false,
        salesforce_consumer_key: null,
        salesforce_consumer_secret: null,
        salesforce_access_token: null,
        salesforce_token_expiry: null,
        salesforce_instance_url: null,
      });
    },
    onSuccess: () => {
      setSuccess("Salesforce disconnected successfully");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err.message || "Failed to disconnect Salesforce");
      setTimeout(() => setError(null), 5000);
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('syncFromSalesforce', {});
      setSuccess(`Synced ${response.data.synced_count} organizations from Salesforce`);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to sync from Salesforce");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="settings-card">
      <CardContent className="settings-card-body pt-6">
        <div className="settings-row-responsive">
          <div className="settings-text-block">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="settings-card-title">Salesforce Integration</h3>
              <Badge variant={isConnected ? "default" : "outline"}>
                {isConnected ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            <p className="settings-card-description">
              Sync Salesforce Accounts using External Client Apps (OAuth 2.0 Client Credentials)
            </p>
          </div>

          <Button asChild variant="outline" className="settings-secondary-button">
            <a
              href="https://help.salesforce.com/s/articleView?id=xcloud.meta_configure_client_credentials_flow_for_external_client_apps.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Salesforce docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        <div className="space-y-4 pt-4">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="settings-feedback-success">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="settings-feedback-success-text">{success}</AlertDescription>
            </Alert>
          )}

          {!isConnected ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="settings-section-title mb-3">Setup Instructions</p>
                <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
                  <li>Log in to your Salesforce org as an administrator</li>
                  <li>Go to Setup → Apps → App Manager</li>
                  <li>Click "New External Client App"</li>
                  <li>Enable OAuth Settings and select "Enable Client Credentials Flow"</li>
                  <li>
                    Configure these OAuth scopes:
                    <ul className="ml-6 mt-1 list-disc space-y-1">
                      <li>api - Full API access</li>
                      <li>refresh_token - Access without login</li>
                      <li>offline_access - Perform requests at any time</li>
                    </ul>
                  </li>
                  <li>Under "Client Credentials Flow", select a run-as user</li>
                  <li>Save and copy the Consumer Key and Consumer Secret</li>
                  <li>No callback URL is needed for Client Credentials Flow</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="settings-label">Salesforce Instance URL</label>
                  <Input
                    value={instanceUrl}
                    onChange={(e) => setInstanceUrl(e.target.value)}
                    placeholder="https://yourinstance.my.salesforce.com"
                    className="settings-input"
                  />
                  <p className="settings-helper">
                    Your Salesforce instance URL (for example, https://yourcompany.my.salesforce.com)
                  </p>
                </div>

                <div>
                  <label className="settings-label">Consumer Key</label>
                  <Input
                    value={consumerKey}
                    onChange={(e) => setConsumerKey(e.target.value)}
                    placeholder="Paste Consumer Key from External Client App"
                    className="settings-input"
                  />
                </div>

                <div>
                  <label className="settings-label">Consumer Secret</label>
                  <Input
                    type="password"
                    value={consumerSecret}
                    onChange={(e) => setConsumerSecret(e.target.value)}
                    placeholder="Paste Consumer Secret from External Client App"
                    className="settings-input"
                  />
                  <p className="settings-helper">Keep this secret secure — it will be encrypted in storage.</p>
                </div>
              </div>

              <div className="settings-actions">
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={!instanceUrl || !consumerKey || !consumerSecret || connectMutation.isPending}
                  className="settings-primary-button"
                >
                  {connectMutation.isPending ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect External Client App"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="settings-section-title">Connected via External Client App</p>
                    <p className="text-sm text-slate-600">
                      Instance: {organization.salesforce_instance_url || "Unknown"}
                    </p>
                    {organization.salesforce_last_sync && (
                      <p className="text-xs text-slate-500">
                        Last synced: {new Date(organization.salesforce_last_sync).toLocaleString()}
                      </p>
                    )}
                    {organization.salesforce_token_expiry && (
                      <p className="text-xs text-slate-500">
                        Token expires: {new Date(organization.salesforce_token_expiry).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </div>

              <div className="settings-actions">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    onClick={handleSync}
                    disabled={syncing}
                    variant="outline"
                    className="settings-secondary-button"
                  >
                    {syncing ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Import from Salesforce
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="settings-secondary-button"
                    onClick={() => setError("Manual push not yet implemented. Organizations with salesforce_id will auto-sync.")}
                  >
                    <Upload className="h-4 w-4" />
                    Push to Salesforce
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    className="settings-secondary-button"
                  >
                    {disconnectMutation.isPending ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}