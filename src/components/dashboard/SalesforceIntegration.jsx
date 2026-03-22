import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader, RefreshCw, Upload, Download } from "lucide-react";

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
      <CardHeader className="settings-card-header">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="settings-card-title flex items-center gap-2">
              Salesforce Integration (External Client App)
              {isConnected ? (
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-600">Not Connected</Badge>
              )}
            </CardTitle>
            <CardDescription className="settings-card-description">
              Sync Salesforce Accounts using External Client Apps (OAuth 2.0 Client Credentials)
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="settings-card-body space-y-5">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Log in to your Salesforce org as an administrator</li>
                <li>Go to Setup → Apps → App Manager</li>
                <li>Click "New External Client App"</li>
                <li>Enable OAuth Settings and select "Enable Client Credentials Flow"</li>
                <li>Configure these OAuth Scopes:
                  <ul className="ml-6 mt-1 list-disc">
                    <li>api - Full API access</li>
                    <li>refresh_token - Access without login</li>
                    <li>offline_access - Perform requests at any time</li>
                  </ul>
                </li>
                <li>Under "Client Credentials Flow", select a run-as user (typically an integration user with appropriate permissions)</li>
                <li>Save and copy the Consumer Key and Consumer Secret</li>
                <li>Note: No callback URL is needed for Client Credentials Flow</li>
              </ol>
            </div>

            <div className="space-y-4">
              <div>
                <label className="settings-label">
                  Salesforce Instance URL
                </label>
                <Input
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                  placeholder="https://yourinstance.my.salesforce.com"
                  className="settings-input"
                />
                <p className="settings-helper">
                  Your Salesforce instance URL (e.g., https://yourcompany.my.salesforce.com)
                </p>
              </div>

              <div>
                <label className="settings-label">
                  Consumer Key
                </label>
                <Input
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="Paste Consumer Key from External Client App"
                  className="settings-input"
                />
              </div>

              <div>
                <label className="settings-label">
                  Consumer Secret
                </label>
                <Input
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="Paste Consumer Secret from External Client App"
                  className="settings-input"
                />
                <p className="settings-helper">
                  Keep this secret secure - it will be encrypted in storage
                </p>
              </div>
            </div>

            <Button
              onClick={() => connectMutation.mutate()}
              disabled={!instanceUrl || !consumerKey || !consumerSecret || connectMutation.isPending}
              className="settings-primary-button w-full"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect External Client App"
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Need help? See{" "}
              <a 
                href="https://help.salesforce.com/s/articleView?id=xcloud.meta_configure_client_credentials_flow_for_external_client_apps.htm" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Salesforce documentation
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-900">Connected via External Client App</p>
                  <p className="text-sm text-green-700 mt-1">
                    Instance: {organization.salesforce_instance_url || "Unknown"}
                  </p>
                  {organization.salesforce_last_sync && (
                    <p className="text-xs text-green-600 mt-1">
                      Last synced: {new Date(organization.salesforce_last_sync).toLocaleString()}
                    </p>
                  )}
                  {organization.salesforce_token_expiry && (
                    <p className="text-xs text-green-600">
                      Token expires: {new Date(organization.salesforce_token_expiry).toLocaleString()}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
                className="settings-secondary-button w-full"
              >
                {syncing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import from Salesforce
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="settings-secondary-button w-full"
                onClick={() => setError("Manual push not yet implemented. Organizations with salesforce_id will auto-sync.")}
              >
                <Upload className="w-4 h-4 mr-2" />
                Push to Salesforce
              </Button>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="w-full"
              >
                {disconnectMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  "Disconnect External Client App"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}