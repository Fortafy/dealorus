import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, HardDrive, Mail } from "lucide-react";
import GoogleIntegrationCard from "@/components/dashboard/GoogleIntegrationCard";

export default function ConnectedAppsSection() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(location.search);
  const oauthStatus = searchParams.get("google_oauth");
  const oauthMessage = searchParams.get("message");
  const [gmailRecord, setGmailRecord] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);

  const { data: integrations = [] } = useQuery({
    queryKey: ["user-integrations"],
    queryFn: () => base44.entities.UserIntegration.list("-updated_date", 20),
    initialData: [],
  });

  const integrationsByType = useMemo(
    () => Object.fromEntries(integrations.map((record) => [record.integration_type, record])),
    [integrations]
  );

  const fetchGmailConnection = async () => {
    try {
      const response = await base44.functions.invoke("sendProposalPdfEmailWithGmail", {});
      if (response?.data?.error === 'Missing required fields') {
        setGmailConnected(true);
        setGmailRecord({ status: 'connected', account_email: 'Gmail account connected' });
      }
    } catch {
      setGmailConnected(false);
      setGmailRecord(null);
    }
  };

  useEffect(() => {
    fetchGmailConnection();
  }, []);

  const connectMutation = useMutation({
    mutationFn: async (integrationType) => {
      const response = await base44.functions.invoke("startGoogleOAuth", {
        integrationType,
        appOrigin: window.location.origin,
      });
      window.location.href = response.data.authUrl;
      return response.data;
    },
  });

  const gmailConnectMutation = useMutation({
    mutationFn: async () => {
      const url = await base44.connectors.connectAppUser("69e6a0603f40a2278282ab3b");
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          fetchGmailConnection();
        }
      }, 500);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (record) =>
      base44.entities.UserIntegration.update(record.id, {
        status: "disconnected",
        access_token: null,
        refresh_token: null,
        expires_at: null,
        scopes: [],
        account_email: null,
        account_name: null,
        error_message: null,
        metadata: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
  });

  const gmailDisconnectMutation = useMutation({
    mutationFn: async () => {
      await base44.connectors.disconnectAppUser("69e6a0603f40a2278282ab3b");
      setGmailConnected(false);
      setGmailRecord(null);
    },
  });

  const isBusy = connectMutation.isPending || disconnectMutation.isPending || gmailConnectMutation.isPending || gmailDisconnectMutation.isPending;

  return (
    <div className="settings-page">
      <div className="settings-stack">
        <div>
          <h1 className="settings-page-title">Connected Apps</h1>
          <p className="text-sm text-slate-500">Connect your own Google accounts for Drive, Calendar, and Gmail access.</p>
        </div>

        {oauthStatus && oauthMessage && (
          <Alert className={oauthStatus === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <AlertDescription className={oauthStatus === "success" ? "text-green-800" : "text-red-700"}>
              {oauthMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <GoogleIntegrationCard
            icon={HardDrive}
            title="Google Drive"
            description="Connect your Google Drive account so your files can be used inside Dealorus."
            record={integrationsByType.google_drive}
            busy={isBusy}
            onConnect={() => connectMutation.mutate("google_drive")}
            onDisconnect={() => disconnectMutation.mutate(integrationsByType.google_drive)}
          />
          <GoogleIntegrationCard
            icon={Calendar}
            title="Google Calendar"
            description="Connect your Google Calendar account so events can be used inside Dealorus."
            record={integrationsByType.google_calendar}
            busy={isBusy}
            onConnect={() => connectMutation.mutate("google_calendar")}
            onDisconnect={() => disconnectMutation.mutate(integrationsByType.google_calendar)}
          />
          <GoogleIntegrationCard
            icon={Mail}
            title="Gmail"
            description="Connect your Gmail account so proposal emails can be sent to external recipients from your own inbox."
            record={gmailRecord}
            busy={isBusy}
            onConnect={() => gmailConnectMutation.mutate()}
            onDisconnect={() => gmailDisconnectMutation.mutate()}
          />
        </div>
      </div>
    </div>
  );
}