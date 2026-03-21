import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Building2, CloudUpload, ChevronRight, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ORG_FIELDS = [
  { key: "organization_name", label: "Organization Name", required: true },
  { key: "state", label: "State", required: true },
  { key: "city", label: "City" },
  { key: "address", label: "Address" },
  { key: "zip_code", label: "Zip Code" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "ein", label: "EIN" },
  { key: "organization_type", label: "Organization Type" },
  { key: "ntee_code", label: "NTEE Code" },
  { key: "annual_revenue", label: "Annual Revenue" },
  { key: "mission", label: "Mission" },
];

export default function OrganizationsImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(0); // 0=upload, 1=map, 2=review
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
    const rows = lines.slice(1).map(line => {
      const vals = [];
      let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
      vals.push(cur.trim());
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
    return { headers, rows };
  };

  const handleFile = (f) => {
    if (!f || !f.name.endsWith(".csv")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result);
      setCsvHeaders(headers);
      setCsvRows(rows);
      // Auto-map by matching header names
      const autoMap = {};
      ORG_FIELDS.forEach(field => {
        const match = headers.find(h =>
          h.toLowerCase().replace(/[\s_-]/g, "") === field.key.toLowerCase().replace(/[\s_-]/g, "") ||
          h.toLowerCase().replace(/[\s_-]/g, "") === field.label.toLowerCase().replace(/[\s_-]/g, "")
        );
        if (match) autoMap[field.key] = match;
      });
      setMapping(autoMap);
    };
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleNext = async () => {
    if (step === 0 && file) { setStep(1); return; }
    if (step === 1) { setStep(2); return; }
    if (step === 2) {
      setImporting(true);
      const records = csvRows.map(row => {
        const obj = { client_id: currentUser?.client_id, source_system: "CSV Import" };
        Object.entries(mapping).forEach(([field, csvCol]) => {
          if (csvCol && row[csvCol] !== undefined) obj[field] = row[csvCol];
        });
        return obj;
      }).filter(r => r.organization_name && r.state);
      try {
        await base44.entities.Organization.bulkCreate(records);
        setImportResult({ success: true, count: records.length });
      } catch (e) {
        setImportResult({ success: false, error: e.message });
      }
      setImporting(false);
    }
  };

  const canNext = (step === 0 && !!file) || (step === 1) || (step === 2 && !importing && !importResult);

  const steps = ["Upload file", "Map columns", "Review values"];

  if (importResult) {
    return (
      <div className="h-full bg-white flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/Organizations" className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium">
              <Building2 className="w-4 h-4" /> Organizations
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Import</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            {importResult.success ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Import complete</h2>
                <p className="text-slate-500 mb-6">{importResult.count} organizations imported successfully.</p>
                <Button onClick={() => navigate("/Organizations")} style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: 'white' }}>
                  Back to Organizations
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Import failed</h2>
                <p className="text-slate-500 mb-6">{importResult.error}</p>
                <Button variant="outline" onClick={() => setImportResult(null)}>Try again</Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/Organizations" className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium">
            <Building2 className="w-4 h-4" /> Organizations
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Import</span>
        </div>
        <Button
          onClick={handleNext}
          disabled={!canNext || importing}
          style={{ backgroundColor: 'hsl(217, 91%, 20%)', color: 'white' }}
          className="hover:opacity-90 h-8 px-5 text-sm font-medium"
        >
          {importing ? "Importing..." : step === 2 ? "Import" : "Next"}
        </Button>
      </div>

      {/* Steps */}
      <div className="border-b border-slate-200 py-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-0">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  i < step ? "border-blue-600 bg-blue-600" : i === step ? "border-slate-400" : "border-slate-300"
                }`}>
                  {i < step && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className={`text-sm ${i === step ? "text-slate-700 font-medium" : "text-slate-400"}`}>{s}</span>
              </div>
              {i < steps.length - 1 && <div className="w-16 h-px bg-slate-200 mx-3" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-8">
        {step === 0 && (
          <div className="max-w-2xl mx-auto">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                dragOver ? "border-blue-400 bg-blue-50" : file ? "border-green-400 bg-green-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                <CloudUpload className="w-7 h-7 text-slate-500" />
              </div>
              {file ? (
                <>
                  <p className="text-sm font-semibold text-slate-700 mb-1">{file.name}</p>
                  <p className="text-xs text-slate-500">{csvRows.length} rows detected</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Drop your .CSV file onto this area to upload</p>
                  <p className="text-xs text-slate-400 mb-4">or</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-4 py-1.5 text-sm border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-700"
                  >
                    Choose a .CSV file
                  </button>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Map your CSV columns to organization fields</h3>
            <div className="space-y-3">
              {ORG_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-4">
                  <div className="w-48 text-xs text-slate-600 font-medium">
                    {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <select
                    value={mapping[field.key] || ""}
                    onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="flex-1 h-8 text-xs border border-slate-200 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="">— Skip —</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-slate-500 mb-4">{csvRows.length} rows ready to import. Preview of first 5:</p>
            <div className="overflow-auto border border-slate-200 rounded-lg">
              <table className="text-xs w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {ORG_FIELDS.filter(f => mapping[f.key]).map(f => (
                      <th key={f.key} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {csvRows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {ORG_FIELDS.filter(f => mapping[f.key]).map(f => (
                        <td key={f.key} className="px-3 py-2 text-slate-600 truncate max-w-xs">{row[mapping[f.key]] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 px-6 py-4 flex-shrink-0 text-center">
        <span className="text-sm text-slate-400">Need help getting started? </span>
        <a href="#" className="text-sm text-blue-600 hover:underline">View our importing guide</a>
      </div>
    </div>
  );
}