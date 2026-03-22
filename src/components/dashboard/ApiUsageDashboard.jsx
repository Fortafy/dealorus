import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line } from
"recharts";
import { Activity, CheckCircle2, XCircle, Clock, Loader } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = {
  success: "#10b981",
  no_results: "#f59e0b",
  error: "#ef4444"
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export default function ApiUsageDashboard({
  organization,
  currentUser,
  scope = currentUser?.role === "admin" ? "platform" : "client",
  showClientBreakdown = scope === "platform"
}) {
  const isBaseAdmin = currentUser?.role === "admin";
  const isPlatformScope = scope === "platform";

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["api-logs-dashboard", organization?.id, isBaseAdmin, scope],
    enabled: isPlatformScope ? isBaseAdmin : !!organization?.id,
    queryFn: async () => {
      if (isPlatformScope) {
        return base44.entities.ApiRequestLog.list("-created_date", 500);
      }
      return base44.entities.ApiRequestLog.filter({ client_id: organization.id }, "-created_date", 500);
    }
  });

  // For admin: fetch all clients to map names
  const { data: allClients = [] } = useQuery({
    queryKey: ["all-clients-for-api"],
    enabled: isBaseAdmin && isPlatformScope && showClientBreakdown,
    queryFn: () => base44.entities.Client.list()
  });

  const clientMap = useMemo(() => {
    const map = {};
    allClients.forEach((c) => {map[c.id] = c.name;});
    return map;
  }, [allClients]);

  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.response_status === "success").length;
    const noResults = logs.filter((l) => l.response_status === "no_results").length;
    const errors = logs.filter((l) => l.response_status === "error").length;
    const avgTime = total > 0 ?
    Math.round(logs.reduce((s, l) => s + (l.response_time_ms || 0), 0) / total) :
    0;
    return { total, success, noResults, errors, avgTime };
  }, [logs]);

  // Last 14 days trend
  const trendData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const day = startOfDay(subDays(new Date(), 13 - i));
      return { date: format(day, "MMM d"), dayStr: format(day, "yyyy-MM-dd"), total: 0, success: 0, error: 0 };
    });
    logs.forEach((log) => {
      if (!log.created_date) return;
      const dayStr = format(new Date(log.created_date), "yyyy-MM-dd");
      const found = days.find((d) => d.dayStr === dayStr);
      if (found) {
        found.total++;
        if (log.response_status === "success") found.success++;
        if (log.response_status === "error") found.error++;
      }
    });
    return days;
  }, [logs]);

  // Status breakdown pie
  const statusData = useMemo(() => {
    const data = [];
    if (stats.success > 0) data.push({ name: "Success", value: stats.success, color: COLORS.success });
    if (stats.noResults > 0) data.push({ name: "No Results", value: stats.noResults, color: COLORS.no_results });
    if (stats.errors > 0) data.push({ name: "Errors", value: stats.errors, color: COLORS.error });
    return data;
  }, [stats]);

  // Sources used breakdown
  const sourcesData = useMemo(() => {
    const counts = {};
    logs.forEach((log) => {
      (log.enrichment_sources || []).forEach((src) => {
        counts[src] = (counts[src] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [logs]);

  // Per-client breakdown (admin only)
  const clientData = useMemo(() => {
    if (!isBaseAdmin || !isPlatformScope || !showClientBreakdown) return [];
    const counts = {};
    logs.forEach((log) => {
      const name = clientMap[log.client_id] || log.client_id?.substring(0, 8) || "Unknown";
      if (!counts[name]) counts[name] = { name, total: 0, success: 0, error: 0 };
      counts[name].total++;
      if (log.response_status === "success") counts[name].success++;
      if (log.response_status === "error") counts[name].error++;
    });
    return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [logs, clientMap, isBaseAdmin, isPlatformScope, showClientBreakdown]);

  // Request source breakdown
  const sourceRequestData = useMemo(() => {
    const counts = {};
    logs.forEach((log) => {
      const src = log.request_source || "Unknown";
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-6 h-6 animate-spin text-slate-400" />
      </div>);

  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900">API Usage</h3>
        



        
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Requests</p>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Successful</p>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.success}</p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.total > 0 ? `${Math.round(stats.success / stats.total * 100)}% success rate` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Errors</p>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.errors}</p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.noResults > 0 ? `+${stats.noResults} no results` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Avg. Response</p>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.avgTime > 0 ? `${stats.avgTime}ms` : "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* 14-day trend + Status pie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Requests — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.total === 0 ?
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data yet</div> :

            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="success" stroke={COLORS.success} strokeWidth={2} dot={false} name="Success" />
                  <Line type="monotone" dataKey="error" stroke={COLORS.error} strokeWidth={2} dot={false} name="Error" />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Response Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ?
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data yet</div> :

            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {statusData.map((entry, i) =>
                  <Cell key={i} fill={entry.color} />
                  )}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v}`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            }
          </CardContent>
        </Card>
      </div>

      {/* Enrichment sources + Request sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Enrichment Sources Used</CardTitle>
            <CardDescription className="text-xs">How many calls touched each data source</CardDescription>
          </CardHeader>
          <CardContent>
            {sourcesData.length === 0 ?
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No data yet</div> :

            <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sourcesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" name="Calls" radius={[0, 4, 4, 0]}>
                    {sourcesData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Requests by Source</CardTitle>
            <CardDescription className="text-xs">Which system initiated each call</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceRequestData.length === 0 ?
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No data yet</div> :

            <div className="space-y-2 pt-1">
                {sourceRequestData.map((src, i) =>
              <div key={src.name} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm text-slate-700 flex-1 truncate">{src.name}</span>
                    <Badge variant="outline" className="text-xs">{src.value}</Badge>
                  </div>
              )}
              </div>
            }
          </CardContent>
        </Card>
      </div>

      {/* Per-Client Breakdown (admin only) */}
      {clientData.length > 0 &&
      <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Usage by Client Organization</CardTitle>
            <CardDescription className="text-xs">Top 10 clients by total API requests (for billing reference)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={clientData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="success" name="Success" fill={COLORS.success} stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="error" name="Error" fill={COLORS.error} stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Table summary */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="pb-2 pr-4">Client</th>
                    <th className="pb-2 pr-4 text-center">Total</th>
                    <th className="pb-2 pr-4 text-center">Success</th>
                    <th className="pb-2 text-center">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientData.map((c) =>
                <tr key={c.name} className="hover:bg-slate-50">
                      <td className="py-2 pr-4 font-medium text-slate-800">{c.name}</td>
                      <td className="py-2 pr-4 text-center">{c.total}</td>
                      <td className="py-2 pr-4 text-center text-green-700">{c.success}</td>
                      <td className="py-2 text-center text-red-600">{c.error}</td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      }
    </div>);

}