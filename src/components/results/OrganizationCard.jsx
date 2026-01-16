import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  CheckCircle2
} from "lucide-react";
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

export default function OrganizationCard({ data, onSave, isSaved }) {
  const formatAddress = () => {
    const parts = [data.address, data.city, data.state, data.zip_code].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSave(data)}
              disabled={isSaved}
              className={`flex-shrink-0 ${isSaved ? "bg-green-100 text-green-700" : "bg-white/90 text-indigo-700 hover:bg-white"}`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save
                </>
              )}
            </Button>
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
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Data sources: {data.data_sources.join(", ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}