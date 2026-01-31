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
  const [authUrl, setAuthUrl] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const queryClient = useQueryClient();

  const isConnected = organization?.salesforce_connected;

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Client.update(organization.id, {
        salesforce_connected: false,
        salesforce_access_token: null,
        salesforce_refresh_token: null,
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
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Salesforce Integration
              {isConnected ? (
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-600">Not Connected</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Sync Salesforce Accounts with Organizations and push enhanced data back
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
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
                <li>Create a new Connected App with OAuth enabled</li>
                <li>Set the Callback URL to: <code className="bg-blue-100 px-1 py-0.5 rounded">https://your-app-url.com/salesforce/callback</code></li>
                <li>Enable these OAuth Scopes: api, refresh_token, offline_access</li>
                <li>Copy your Consumer Key and Consumer Secret</li>
                <li>Authorize the app and paste the authorization code below</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Authorization Code
              </label>
              <Input
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Paste authorization code from Salesforce"
              />
              <p className="text-xs text-slate-500 mt-1">
                After authorizing the app in Salesforce, paste the code here
              </p>
            </div>

            <Button
              onClick={() => setError("OAuth flow not yet implemented. Please contact support.")}
              disabled={!authCode}
              className="w-full"
              style={{ backgroundColor: 'hsl(217, 91%, 60%)' }}
            >
              Connect Salesforce
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Need help? Contact your administrator or see our{" "}
              <a href="#" className="text-blue-600 hover:underline">
                integration guide
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-900">Connected to Salesforce</p>
                  <p className="text-sm text-green-700 mt-1">
                    Instance: {organization.salesforce_instance_url || "Unknown"}
                  </p>
                  {organization.salesforce_last_sync && (
                    <p className="text-xs text-green-600 mt-1">
                      Last synced: {new Date(organization.salesforce_last_sync).toLocaleString()}
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
                className="w-full"
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
                className="w-full"
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
                  "Disconnect Salesforce"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}