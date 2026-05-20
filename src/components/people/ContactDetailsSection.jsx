import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import ContactOrganizationsList from "@/components/people/ContactOrganizationsList";
import InlineTextDetailField from "@/components/people/InlineTextDetailField";
import MultiValueInlineField from "@/components/people/MultiValueInlineField";
import RecordLabelsEditor from "@/components/labels/RecordLabelsEditor";

const LINKEDIN_PROFILE_URL_REGEX = /^https:\/\/www\.linkedin\.com\/in\/[^/?#]+\/?$/i;

const formatLinkedInDisplayValue = (value) => {
  const match = value?.trim().match(/^https:\/\/www\.linkedin\.com\/in\/([^/?#]+)\/?$/i);
  return match ? match[1] : value;
};

const normalizeActivityValue = (value) => {
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => item == null ? null : String(item).trim()).filter(Boolean);
    return cleaned.length ? cleaned.join(", ") : null;
  }

  if (value == null) return null;
  const normalized = typeof value === "string" ? value.trim() : String(value);
  return normalized || null;
};

const formatFieldLabel = (field) => field
  .split("_")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export default function ContactDetailsSection({ contact, organizations = [], onSaved, onOrganizationSaved }) {
  const [isOpen, setIsOpen] = useState(true);

  const { data: labels = [] } = useQuery({
    queryKey: ["labels", contact.client_id],
    enabled: !!contact.client_id,
    queryFn: () => base44.entities.Label.filter({ client_id: contact.client_id }, "name"),
  });

  const emailValues = Array.isArray(contact.email_addresses) ?
  contact.email_addresses.filter(Boolean) :
  contact.email ? [contact.email] : [];

  const phoneValues = Array.isArray(contact.phone_numbers) ?
  contact.phone_numbers.filter(Boolean) :
  contact.phone ? [contact.phone] : [];

  const saveContact = async (updates) => {
    const fieldsChanged = Object.entries(updates)
      .map(([field, newValue]) => ({
        field,
        old_value: normalizeActivityValue(contact[field]),
        new_value: normalizeActivityValue(newValue)
      }))
      .filter((change) => change.old_value !== change.new_value);

    const updatedContact = {
      ...contact,
      ...updates,
      last_modified: new Date().toISOString()
    };

    await base44.entities.Contact.update(contact.id, { ...updatedContact, client_id: contact.client_id });

    if (fieldsChanged.length > 0) {
      await base44.entities.Activity.create({
        client_id: contact.client_id,
        organization_id: contact.organization_id,
        contact_id: contact.id,
        action: "edit",
        description: fieldsChanged
          .map((change) => `${formatFieldLabel(change.field)}: ${change.old_value ?? "empty"} → ${change.new_value ?? "empty"}`)
          .join(" • "),
        fields_changed: fieldsChanged
      });
    }

    onSaved(updatedContact);
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <button
          className="flex flex-1 items-center justify-between text-left transition-opacity hover:opacity-80"
          onClick={() => setIsOpen((current) => !current)}>
          
          <span className="text-sm font-semibold text-slate-700">Details</span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
      </div>

      {isOpen ?
      <div className="px-4 py-2">
          <div className="divide-y divide-slate-100">
            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Labels</div>
              <RecordLabelsEditor
                labels={labels}
                selectedIds={contact.label_ids || []}
                onChange={(labelIds) => saveContact({ label_ids: labelIds })}
                objectType="Contact"
                triggerVariant="field"
                placeholder="Add Labels"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Email addresses</div>
              <MultiValueInlineField
              values={emailValues}
              onSave={(values) => saveContact({ email_addresses: values, email: values[0] || null })}
              placeholder="Add Email addresses" />
            
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Phone numbers</div>
              <MultiValueInlineField
              values={phoneValues}
              onSave={(values) => saveContact({ phone_numbers: values, phone: values[0] || null })}
              placeholder="Add Phone numbers" />
            
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Description</div>
              <InlineTextDetailField
              value={contact.description}
              onSave={(value) => saveContact({ description: value })}
              placeholder="Add Description"
              multiline />
            
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">Department</div>
              <InlineTextDetailField
              value={contact.role_department}
              onSave={(value) => saveContact({ role_department: value })}
              placeholder="Add Department" />
            
            </div>

            <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
              <div className="pt-2 text-xs text-slate-500">LinkedIn</div>
              <InlineTextDetailField
              value={contact.linkedin}
              onSave={(value) => saveContact({ linkedin: value })}
              placeholder="Add LinkedIn"
              isLink
              validate={(value) => LINKEDIN_PROFILE_URL_REGEX.test(value)}
              validationMessage="copy & paste the full linkedin url of the person"
              displayValueFormatter={formatLinkedInDisplayValue} />
            
            </div>
          </div>

          <div className="-mx-4 mt-3">
            <ContactOrganizationsList organizations={organizations} onOrganizationSaved={onOrganizationSaved} />
          </div>

        </div> :
      null}
    </div>);

}