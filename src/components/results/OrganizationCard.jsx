import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EditOrganizationDialog from "@/components/organizations/EditOrganizationDialog";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Hash,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Save,
  ExternalLink,
  CheckCircle2,
  Pencil,
  Trash2,
  Sparkles
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

function DataRow({ icon: Icon, label, value, isLink }) {
  if (!value || value === "N/A" || value === "Not found") return null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        {isLink ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
          >
            {value}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm text-slate-800 break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function OrganizationCard({ data, onSave, isSaved, onDelete, onEdit }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichingSource, setEnrichingSource] = useState(null);

  const formatAddress = () => {
    const parts = [data.address, data.city, data.state, data.zip_code].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleEdit = (updatedData) => {
    if (onEdit) {
      onEdit(updatedData);
    }
  };

  const handleAIEnrich = async () => {
    setIsEnriching(true);

    const prompt = `Enrich and improve the following organization data:

Organization: ${data.organization_name}
State: ${data.state}
EIN: ${data.ein || "Not provided"}
Address: ${data.address || "Not provided"}
City: ${data.city || "Not provided"}
ZIP: ${data.zip_code || "Not provided"}
NTEE Code: ${data.ntee_code || "Not provided"}
Mission: ${data.mission || "Not provided"}

Tasks:
1. Verify and standardize the address format (use proper USPS format)
2. Find the EIN if missing, verify if provided
3. Find the NTEE code if missing, verify if provided
4. If mission exists, summarize it into 2-3 concise key points
5. Keep all other fields unchanged

Return the enriched data with these exact fields:
- address: Standardized street address
- city: City name
- zip_code: ZIP code
- ein: EIN in XX-XXXXXXX format
- ntee_code: NTEE code
- mission: Summarized mission (if original exists, otherwise keep original)`;

    try {
      const enrichedData = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            address: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
            zip_code: { type: ["string", "null"] },
            ein: { type: ["string", "null"] },
            ntee_code: { type: ["string", "null"] },
            mission: { type: ["string", "null"] },
          },
        },
      });

      const updatedData = {
        ...data,
        address: enrichedData.address || data.address,
        city: enrichedData.city || data.city,
        zip_code: enrichedData.zip_code || data.zip_code,
        ein: enrichedData.ein || data.ein,
        ntee_code: enrichedData.ntee_code || data.ntee_code,
        mission: enrichedData.mission || data.mission,
      };

      if (onEdit) {
        onEdit(updatedData);
      }
    } catch (err) {
      console.error("AI enrichment failed:", err);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSourceEnrich = async (source) => {
    setEnrichingSource(source);
    setIsEnriching(true);

    const sourceInstructions = {
      'CharityAPI': 'Query CharityAPI.org ONLY using the API key. Do not use any other sources.',
      'ProPublica': 'Search ProPublica Nonprofit Explorer ONLY. Use their verified nonprofit financial data.',
      'IRS': 'Search IRS Ezar Database ONLY. Use official IRS tax-exempt organization data.',
      'GuideStar': 'Search GuideStar/Candid ONLY. Use their nonprofit profiles and financial data.'
    };

    const prompt = `Find and enrich data for this organization using ${source} ONLY:

Organization: ${data.organization_name}
State: ${data.state}
EIN: ${data.ein || "Unknown"}

CRITICAL: ${sourceInstructions[source]}
DO NOT use any other data sources. Only return data found in ${source}.

Return complete organization data:
- organization_name, state, ein, address, city, zip_code, phone, email, website
- organization_type, mission, annual_revenue, ntee_code, ruling_date
- data_sources: Must be ["${source}"] only

If any field is not found in ${source}, set it to null.`;

    try {
      const enrichedData = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            organization_name: { type: "string" },
            state: { type: "string" },
            ein: { type: ["string", "null"] },
            address: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
            zip_code: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            website: { type: ["string", "null"] },
            organization_type: { type: ["string", "null"] },
            mission: { type: ["string", "null"] },
            annual_revenue: { type: ["string", "null"] },
            ntee_code: { type: ["string", "null"] },
            ruling_date: { type: ["string", "null"] },
            data_sources: { type: "array", items: { type: "string" } },
          },
        },
      });

      const updatedData = {
        ...data,
        ...enrichedData,
        id: data.id,
      };

      if (onEdit) {
        onEdit(updatedData);
      }
    } catch (err) {
      console.error(`${source} enrichment failed:`, err);
    } finally {
      setIsEnriching(false);
      setEnrichingSource(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">{data.organization_name}</h2>
              <div className="flex flex-wrap gap-2">
                {data.organization_type && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    {data.organization_type}
                  </Badge>
                )}
                {data.ntee_code && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    NTEE: {data.ntee_code}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSave(data)}
                disabled={isSaved}
                className={`flex-shrink-0 h-8 w-8 p-0 ${isSaved ? "bg-green-100 text-green-700" : "bg-white/90 text-indigo-700 hover:bg-white"}`}
                title={isSaved ? "Saved" : "Save"}
              >
                {isSaved ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAIEnrich}
                disabled={isEnriching}
                className="bg-white/90 text-indigo-700 hover:bg-white h-8 w-8 p-0"
                title="AI Enrich"
              >
                {isEnriching ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-700/30 border-t-indigo-700 rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="bg-white/90 text-indigo-700 hover:bg-white h-8 w-8 p-0"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(data.id)}
                  className="h-8 w-8 p-0"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {data.mission && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mission</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{data.mission}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-x-8">
            <div>
              <DataRow icon={Hash} label="EIN" value={data.ein} />
              <DataRow icon={MapPin} label="Address" value={formatAddress()} />
              <DataRow icon={Phone} label="Phone" value={data.phone} />
              <DataRow icon={Mail} label="Email" value={data.email} />
            </div>
            <div>
              <DataRow icon={Globe} label="Website" value={data.website} isLink />
              <DataRow icon={DollarSign} label="Annual Revenue" value={data.annual_revenue} />
              <DataRow icon={Calendar} label="Tax-Exempt Since" value={data.ruling_date} />
              <DataRow icon={Tag} label="Classification" value={data.ntee_code ? `NTEE Code: ${data.ntee_code}` : null} />
            </div>
          </div>

          {data.data_sources && data.data_sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Data sources: {data.data_sources.join(", ")}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSourceEnrich('CharityAPI')}
                  disabled={isEnriching}
                  className="h-7 text-xs"
                >
                  {enrichingSource === 'CharityAPI' ? (
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-1" />
                  ) : null}
                  CharityAPI
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSourceEnrich('ProPublica')}
                  disabled={isEnriching}
                  className="h-7 text-xs"
                >
                  {enrichingSource === 'ProPublica' ? (
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-1" />
                  ) : null}
                  ProPublica
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSourceEnrich('IRS')}
                  disabled={isEnriching}
                  className="h-7 text-xs"
                >
                  {enrichingSource === 'IRS' ? (
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-1" />
                  ) : null}
                  IRS Ezar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSourceEnrich('GuideStar')}
                  disabled={isEnriching}
                  className="h-7 text-xs"
                >
                  {enrichingSource === 'GuideStar' ? (
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-1" />
                  ) : null}
                  GuideStar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditOrganizationDialog
        organization={data}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEdit}
      />
    </motion.div>
  );
}