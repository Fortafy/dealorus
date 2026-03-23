import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ExternalLink, MapPin } from "lucide-react";

export default function ContactOrganizationsList({ organization }) {
  const [isOpen, setIsOpen] = useState(true);
  const count = organization ? 1 : 0;

  return (
    <div className="border-b border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
        <button onClick={() => setIsOpen((current) => !current)} className="flex w-full items-center justify-between text-left hover:opacity-80 transition-opacity">
          <span className="text-sm font-semibold text-slate-700">Organizations ({count})</span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
      </div>

      {isOpen && (
        <div className="px-4 py-3">
          {!organization ? (
            <p className="text-sm text-slate-500">No organization linked.</p>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{organization.organization_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {organization.organization_type ? <Badge variant="secondary">{organization.organization_type}</Badge> : null}
                    {organization.website ? (
                      <a href={organization.website.startsWith("http") ? organization.website : `https://${organization.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
              {(organization.city || organization.state) ? (
                <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3" />
                  {[organization.city, organization.state].filter(Boolean).join(", ")}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}