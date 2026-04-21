import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import GoogleServiceCard from "@/components/dashboard/GoogleServiceCard";
import { Button } from "@/components/ui/button";

const CONNECTORS = [
  {
    id: "69e6a0603f40a2278282ab3b",
    title: "Gmail",
    description: "Send proposal emails and other CRM emails from your Google account.",
  },
  {
    id: "69e78b0349588f549c49e4dd",
    title: "Google Drive",
    description: "Browse Drive files and attach them to deals, organizations, and contacts.",
  },
  {
    id: "69e78b18ac9648163b54e4b1",
    title: "Google Calendar",
    description: "View your calendar and create meetings from the CRM.",
  },
];

const getDefaultConnections = () =>
  Object.fromEntries(
    CONNECTORS.map((connector) => [
      connector.id,
      {
        status: "disconnected",
        accountLabel: "",
      },
    ])
  );

export default function ConnectedAppsSection() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [connections, setConnections] = useState(getDefaultConnections());

  useEffect(() => {
    const initialize = async () => {
      const authed = await base44.auth.isAuthenticated();
      setIsAuthenticated(authed);
      setIsCheckingAuth(false);
    };

    initialize();
  }, []);

  const refreshConnection = async (connectorId) => {
    try {
      const me = await base44.auth.me();
      setConnections((current) => ({
        ...current,
        [connectorId]: {
          status: "connected",
          accountLabel: me?.email || me?.full_name || "Connected account",
        },
      }));
    } catch {
      setConnections((current) => ({
        ...current,
        [connectorId]: {
          status: "disconnected",
          accountLabel: "",
        },
      }));
    }
  };

  const handleConnect = async (connectorId) => {
    setLoadingId(connectorId);
    const url = await base44.connectors.connectAppUser(connectorId);
    const popup = window.open(url, "_blank");

    const timer = window.setInterval(async () => {
      if (!popup || popup.closed) {
        window.clearInterval(timer);
        await refreshConnection(connectorId);
        setLoadingId(null);
      }
    }, 500);
  };

  const handleDisconnect = async (connectorId) => {
    setLoadingId(connectorId);
    await base44.connectors.disconnectAppUser(connectorId);
    setConnections((current) => ({
      ...current,
      [connectorId]: {
        status: "disconnected",
        accountLabel: "",
      },
    }));
    setLoadingId(null);
  };

  if (isCheckingAuth) {
    return (
      <div className="settings-page settings-page--narrow">
        <div className="settings-card">
          <div className="settings-card-body-stack">
            <h1 className="settings-page-title mb-0">Connected Apps</h1>
            <p className="text-sm text-slate-500">Loading your Google connection settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="settings-page settings-page--narrow">
        <div className="settings-card">
          <div className="settings-card-body-stack">
            <div>
              <h1 className="settings-page-title mb-2">Connected Apps</h1>
              <p className="text-sm text-slate-500">Sign in to connect Gmail, Google Drive, and Google Calendar to your CRM account.</p>
            </div>
            <div>
              <Button onClick={() => base44.auth.redirectToLogin()}>Sign in</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-stack">
        <div>
          <h1 className="settings-page-title">Connected Apps</h1>
          <p className="text-sm text-slate-500">Connect Gmail, Google Drive, and Google Calendar separately so each user can enable only the Google services they need.</p>
        </div>

        {CONNECTORS.map((connector) => (
          <GoogleServiceCard
            key={connector.id}
            title={connector.title}
            description={connector.description}
            status={connections[connector.id]?.status || "disconnected"}
            accountLabel={connections[connector.id]?.accountLabel}
            isLoading={loadingId === connector.id}
            onConnect={() => handleConnect(connector.id)}
            onDisconnect={() => handleDisconnect(connector.id)}
          />
        ))}
      </div>
    </div>
  );
}