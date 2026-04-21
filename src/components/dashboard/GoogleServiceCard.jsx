import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GoogleServiceCard({
  title,
  description,
  status,
  accountLabel,
  isLoading,
  onConnect,
  onDisconnect,
}) {
  const isConnected = status === "connected";

  return (
    <div className="settings-card">
      <div className="settings-card-body-stack">
        <div className="settings-row-between items-start">
          <div className="settings-text-block">
            <div className="flex items-center gap-3">
              <h2 className="settings-card-title">{title}</h2>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <p className="settings-card-description">{description}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-700">Connected account</p>
          <p className="mt-1 text-xs text-slate-500">{accountLabel || "No Google account connected yet."}</p>
        </div>

        <div className="settings-actions-between border-t-0 pt-0">
          <div className="text-xs text-slate-500">
            {isConnected ? "This service is ready to use in the CRM." : "Connect only this service if you need it."}
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Button variant="outline" size="sm" onClick={onDisconnect} disabled={isLoading}>
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={onConnect} disabled={isLoading}>
                Connect
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}