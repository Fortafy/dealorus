import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ExternalLink, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import RecordLabelsEditor from "@/components/labels/RecordLabelsEditor";

export default function ContactOrganizationsList({ organizations = [], onOrganizationSaved }) {
  const [isOpen, setIsOpen] = useState(true);
  const count = organizations.length;
  const clientId = organizations[0]?.client_id;

  const { data: labels = [] } = useQuery({
    queryKey: ["labels", clientId],
    enabled: !!clientId,
    queryFn: () => base44.entities.Label.filter({ client_id: clientId }, "name"),
  });

  const handleOrganizationLabelsChange = async (organization, labelIds) => {
    await base44.entities.Organization.update(organization.id, { client_id: organization.client_id, label_ids: labelIds });
    onOrganizationSaved?.();
  };

  return (
    <div className="overflow-hidden border-b border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <button onClick={() => setIsOpen((current) => !current)} className="flex w-full items-center justify-between text-left transition-opacity hover:opacity-80">
          <span className="text-sm font-semibold text-slate-700">Organizations ({count})</span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
      </div>

      {isOpen ? (
        count === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500">No organizations linked.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {organizations.map((organization) => (
              <div key={organization.id} className="px-4 py-3 transition-colors hover:bg-slate-50">
                <Link to={`/Organizations?id=${organization.id}`} className="block w-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900">{organization.organization_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {organization.organization_type ? <Badge variant="secondary">{organization.organization_type}</Badge> : null}
                        {organization.website ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            Website
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        ) : null}
                      </div>
                      {organization.city || organization.state ? (
                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {[organization.city, organization.state].filter(Boolean).join(", ")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
                <RecordLabelsEditor
                  labels={labels}
                  selectedIds={organization.label_ids || []}
                  onChange={(labelIds) => handleOrganizationLabelsChange(organization, labelIds)}
                  objectType="Organization"
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}