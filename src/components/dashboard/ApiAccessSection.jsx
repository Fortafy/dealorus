import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, RefreshCw, Copy, CheckCircle2, XCircle, Clock, Loader, Code } from "lucide-react";

const STATUS_STYLES = {
  success: "bg-green-100 text-green-800",
  no_results: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};

export default function ApiAccessSection({ organization }) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [showApexExample, setShowApexExample] = useState(false);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["api-request-logs", organization?.id],
    enabled: !!organization?.id,
    queryFn: () => base44.asServiceRole
      ? base44.entities.ApiRequestLog.filter({ client_id: organization.id }, "-created_date", 50)
      : base44.entities.ApiRequestLog.filter({ client_id: organization.id }, "-created_date", 50),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateApiKey', {});
      return response.data;
    },
    onSuccess: (data) => {
      setNewKey(data.api_key);
      setShowKey(true);
      queryClient.invalidateQueries({ queryKey: ["client", organization?.id] });
    },
  });

  const currentKey = newKey || organization?.api_key;

  const handleCopy = () => {
    if (currentKey) {
      navigator.clipboard.writeText(currentKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maskedKey = currentKey
    ? `${currentKey.substring(0, 12)}${"•".repeat(20)}${currentKey.slice(-4)}`
    : null;

  const totalRequests = logs.length;
  const successRequests = logs.filter(l => l.response_status === 'success').length;
  const avgResponseTime = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length)
    : 0;

  const apexExample = `HttpRequest req = new HttpRequest();
req.setEndpoint('YOUR_FUNCTION_URL');
req.setMethod('POST');
req.setHeader('Content-Type', 'application/json');
req.setHeader('X-API-Key', '${currentKey || 'YOUR_API_KEY_HERE'}');

Map<String, Object> params = new Map<String, Object>{
    'orgName' => 'American Red Cross',
    'state'   => 'DC',
    'source'  => 'Salesforce'
};
req.setBody(JSON.serialize(params));

Http http = new Http();
HttpResponse res = http.send(req);
Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
List<Object> results = (List<Object>) result.get('results');`;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">API Access</h2>
        <p className="text-slate-500 mt-1">Manage your API credentials and monitor usage from external integrations like Salesforce.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Requests</p>
            <p className="text-3xl font-bold mt-1">{totalRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Success Rate</p>
            <p className="text-3xl font-bold mt-1">
              {totalRequests > 0 ? `${Math.round((successRequests / totalRequests) * 100)}%` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Avg. Response</p>
            <p className="text-3xl font-bold mt-1">{totalRequests > 0 ? `${avgResponseTime}ms` : '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* API Key Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center gap-2">
            API Key
            {currentKey ? (
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500">Not Generated</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Use this key in the <code className="bg-slate-200 px-1 rounded text-xs">X-API-Key</code> header when calling the Dealorus search API from Salesforce or other external systems.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {generateMutation.isError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{generateMutation.error?.message || "Failed to generate key"}</AlertDescription>
            </Alert>
          )}

          {currentKey ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-100 border border-slate-200 rounded-md px-4 py-2.5 text-sm font-mono text-slate-800 truncate">
                {showKey ? currentKey : maskedKey}
              </code>
              <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)} title={showKey ? "Hide key" : "Reveal key"}>
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={handleCopy} title="Copy to clipboard">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No API key generated yet. Click below to create one.</p>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              style={{ backgroundColor: 'hsl(217, 91%, 60%)' }}
              className="text-white hover:opacity-90"
            >
              {generateMutation.isPending ? (
                <><Loader className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : currentKey ? (
                <><RefreshCw className="w-4 h-4 mr-2" />Regenerate Key</>
              ) : (
                "Generate API Key"
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowApexExample(!showApexExample)}>
              <Code className="w-4 h-4 mr-2" />
              {showApexExample ? "Hide" : "Show"} Salesforce Example
            </Button>
          </div>

          {currentKey && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ Regenerating will invalidate your current key immediately. Update all integrations before regenerating.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Apex Code Example */}
      {showApexExample && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 border-b rounded-t-lg">
            <CardTitle className="text-white text-sm font-mono">Salesforce Apex Example</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              POST to the <code>dealorousPublicAPI</code> function URL found in Dashboard → Code → Functions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="bg-slate-900 text-green-300 text-xs p-5 rounded-b-lg overflow-x-auto leading-relaxed">
              {apexExample}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Request Log */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle>Request Log</CardTitle>
          <CardDescription>Last 50 API requests from all external integrations</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {logsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No API requests logged yet.</p>
              <p className="text-xs mt-1">Requests will appear here once your API key is used.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="pb-2 pr-4">Timestamp</th>
                    <th className="pb-2 pr-4">Source</th>
                    <th className="pb-2 pr-4">Search Params</th>
                    <th className="pb-2 pr-4">Sources Used</th>
                    <th className="pb-2 pr-4 text-center">Results</th>
                    <th className="pb-2 pr-4 text-center">Status</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 pr-4 text-xs text-slate-500 whitespace-nowrap">
                        {log.created_date ? new Date(log.created_date).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-700 whitespace-nowrap">
                        {log.request_source || '—'}
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-600 max-w-xs truncate">
                        {log.search_params ? (
                          Object.entries(log.search_params)
                            .filter(([, v]) => v)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ') || '—'
                        ) : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {(log.enrichment_sources || []).map(src => (
                            <span key={src} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                              {src}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-center text-xs font-semibold">
                        {log.result_count ?? '—'}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[log.response_status] || 'bg-slate-100 text-slate-600'}`}>
                          {log.response_status}
                        </span>
                      </td>
                      <td className="py-2 text-right text-xs text-slate-500 whitespace-nowrap">
                        {log.response_time_ms != null ? `${log.response_time_ms}ms` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}