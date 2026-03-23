import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RecordLabelsEditor from "@/components/labels/RecordLabelsEditor";
import InlineTextDetailField from "@/components/people/InlineTextDetailField";
import InlineNTEEField from "@/components/organizations/InlineNTEEField";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";

const buildAddressValue = (organization) => [
  organization.address,
  organization.city,
  [organization.state, organization.zip_code].filter(Boolean).join(" "),
].filter(Boolean).join(", ");

const parseAddressValue = (value) => {
  const parts = value ? value.split(",").map((part) => part.trim()) : [];
  const address = parts[0] || null;
  const city = parts[1] || null;
  const stateZip = parts[2] || "";
  const stateZipParts = stateZip.split(" ").filter(Boolean);

  return {
    address,
    city,
    state: stateZipParts[0] || parts[2] || null,
    zip_code: stateZipParts[1] || parts[3] || null,
  };
};

export default function OrganizationDetailsSection({ organization, onEdit, isSaved = true }) {
  const [isOpen, setIsOpen] = useState(true);

  const displayData = organization.ntee_code && !organization.ntee_description
    ? { ...organization, ntee_description: getNTEEDescription(organization.ntee_code) }
    : organization;

  const { data: labels = [] } = useQuery({
    queryKey: ["labels", organization.client_id],
    enabled: !!organization.client_id,
    queryFn: () => base44.entities.Label.filter({ client_id: organization.client_id }, "name"),
  });

  const saveField = async (field, value) => {
    if (!isSaved || !organization.id) return;
    const updatedData = { ...organization, [field]: value };
    await base44.entities.Organization.update(organization.id, updatedData);
    if (onEdit) onEdit(updatedData);
  };

  const saveNTEE = async (code, description) => {
    if (!isSaved || !organization.id) return;
    const updatedData = {
      ...organization,
      ntee_code: code,
      ntee_description: description || getNTEEDescription(code) || organization.ntee_description,
    };
    await base44.entities.Organization.update(organization.id, updatedData);
    if (onEdit) onEdit(updatedData);
  };

  const saveAddress = async (value) => {
    if (!isSaved || !organization.id) return;
    const updatedData = { ...organization, ...parseAddressValue(value) };
    await base44.entities.Organization.update(organization.id, updatedData);
    if (onEdit) onEdit(updatedData);
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <button
          className="flex flex-1 items-center justify-between text-left transition-opacity hover:opacity-80"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="text-sm font-semibold text-slate-700">Details</span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
      </div>

      {isOpen ? (
        <div className="px-4 py-2">
          <div className="divide-y divide-slate-100">
            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Mission</div>
              <InlineTextDetailField
                value={organization.mission}
                onSave={(value) => saveField("mission", value)}
                placeholder="Add Mission"
                multiline
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Labels</div>
              <RecordLabelsEditor
                labels={labels}
                selectedIds={displayData.label_ids || []}
                onChange={(labelIds) => saveField("label_ids", labelIds)}
                objectType="Organization"
                triggerVariant="field"
                placeholder="Add Labels"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">EIN</div>
              <InlineTextDetailField
                value={organization.ein}
                onSave={(value) => saveField("ein", value)}
                placeholder="Add EIN"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Organization Type</div>
              <InlineTextDetailField
                value={organization.organization_type}
                onSave={(value) => saveField("organization_type", value)}
                placeholder="Add Organization Type"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Annual Revenue</div>
              <InlineTextDetailField
                value={organization.annual_revenue}
                onSave={(value) => saveField("annual_revenue", value)}
                placeholder="Add Annual Revenue"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Tax-Exempt Since</div>
              <InlineTextDetailField
                value={organization.ruling_date}
                onSave={(value) => saveField("ruling_date", value)}
                placeholder="Add Tax-Exempt Date"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Classification</div>
              <InlineNTEEField
                value={displayData.ntee_code}
                description={displayData.ntee_description}
                onSave={saveNTEE}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Phone</div>
              <InlineTextDetailField
                value={organization.phone}
                onSave={(value) => saveField("phone", value)}
                placeholder="Add Phone"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Email</div>
              <InlineTextDetailField
                value={organization.email}
                onSave={(value) => saveField("email", value)}
                placeholder="Add Email"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Website</div>
              <InlineTextDetailField
                value={organization.website}
                onSave={(value) => saveField("website", value)}
                placeholder="Add Website"
                isLink
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Address</div>
              <InlineTextDetailField
                value={buildAddressValue(organization)}
                onSave={saveAddress}
                placeholder="Add Address"
                multiline
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}