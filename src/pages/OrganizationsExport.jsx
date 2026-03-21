import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Building2, ChevronRight, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const EXPORT_FIELDS = [
  { key: "organization_name", label: "Organization Name", default: true },
  { key: "state", label: "State", default: true },
  { key: "city", label: "City", default: true },
  { key: "address", label: "Address", default: true },
  { key: "zip_code", label: "Zip Code", default: true },
  { key: "phone", label: "Phone", default: true },
  { key: "email", label: "Email", default: true },
  { key: "website", label: "Website", default: false },
  { key: "ein", label: "EIN", default: true },
  { key: "organization_type", label: "Organization Type", default: true },
  { key: "ntee_code", label: "NTEE Code", default: false },
  { key: "ntee_description", label: "NTEE Description", default: false },
  { key: "annual_revenue", label: "Annual Revenue", default: true },
  { key: "mission", label: "Mission", default: false },
  { key: "ruling_date", label: "Ruling Date", default: false },
  { key: "is_client", label: "Is Client", default: false },
  { key: "created_date", label: "Created Date", default: false },
];

export default function OrganizationsExport() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedFields, setSelectedFields] = useState(
    () => new Set(EXPORT_FIELDS.filter(f => f.default).map(f => f.key))
  );
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const toggleField = (key) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    if (!currentUser?.client_id) return;
    setExporting(true);
    const orgs = await base44.entities.Organization.filter({ client_id: currentUser.client_id });
    const fields = EXPORT_FIELDS.filter(f => selectedFields.has(f.key));
    const header = fields.map(f => f.label).join(",");
    const rows = orgs.map(org =>
      fields.map(f => {
        const val = org[f.key] ?? "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `organizations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    setDone(true);
  };

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/Organizations" className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium">
            <Building2 className="w-4 h-4" /> Organizations
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Export</span>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting || selectedFields.size === 0}
          style={{ backgroundColor: 'hsl(217, 91%, 20%)', color: 'white' }}
          className="hover:opacity-90 h-8 px-5 text-sm font-medium flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-8">
        {done ? (
          <div className="max-w-sm mx-auto text-center pt-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Export complete</h2>
            <p className="text-slate-500 mb-6">Your CSV file has been downloaded.</p>
            <Button variant="outline" onClick={() => navigate("/Organizations")}>Back to Organizations</Button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Choose fields to export</h3>
            <p className="text-xs text-slate-400 mb-6">Select which columns to include in your CSV file.</p>
            <div className="space-y-2">
              {EXPORT_FIELDS.map(field => (
                <label key={field.key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field.key)}
                    onChange={() => toggleField(field.key)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 px-6 py-4 flex-shrink-0 text-center">
        <span className="text-sm text-slate-400">Need help? </span>
        <a href="#" className="text-sm text-blue-600 hover:underline">View our exporting guide</a>
      </div>
    </div>
  );
}