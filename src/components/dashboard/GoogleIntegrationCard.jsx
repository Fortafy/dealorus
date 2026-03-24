import React from "react";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_STYLES = {
  connected: "bg-green-50 text-green-700 border-green-200",
  disconnected: "bg-slate-100 text-slate-600 border-slate-200",
  error: "bg-red-50 text-red-700 border-red-200",
  pending_reauth: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function GoogleIntegrationCard({ icon: Icon, title, description, record, onConnect, onDisconnect, busy }) {
  const status = record?.status || "disconnected";
  const isConnected = status === "connected";

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <Badge variant="outline" className={STATUS_STYLES[status] || STATUS_STYLES.disconnected}>
          {status.replace("_", " ")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <div>{record?.account_email || "No Google account connected yet."}</div>
          {record?.updated_date && (
            <div className="mt-1 text-xs text-slate-400">Updated {moment(record.updated_date).fromNow()}</div>
          )}
          {record?.error_message && <div className="mt-2 text-xs text-red-600">{record.error_message}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onConnect} disabled={busy}>
            {busy ? "Opening Google..." : isConnected ? "Reconnect" : "Connect"}
          </Button>
          {record && (
            <Button variant="outline" onClick={onDisconnect} disabled={busy}>
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}