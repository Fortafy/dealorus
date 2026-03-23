import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import ContactOrganizationsList from "@/components/people/ContactOrganizationsList";
import InlineTextDetailField from "@/components/people/InlineTextDetailField";
import MultiValueInlineField from "@/components/people/MultiValueInlineField";

export default function ContactDetailsSection({ contact, organizations = [], onSaved }) {
  const [isOpen, setIsOpen] = useState(true);

  const emailValues = Array.isArray(contact.email_addresses) ?
  contact.email_addresses.filter(Boolean) :
  contact.email ? [contact.email] : [];

  const phoneValues = Array.isArray(contact.phone_numbers) ?
  contact.phone_numbers.filter(Boolean) :
  contact.phone ? [contact.phone] : [];

  const saveContact = async (updates) => {
    const updatedContact = {
      ...contact,
      ...updates,
      last_modified: new Date().toISOString()
    };

    await base44.entities.Contact.update(contact.id, updatedContact);
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
            <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:gap-6">
              <div className="pt-2 text-xs text-slate-500">Email addresses</div>
              <MultiValueInlineField
              values={emailValues}
              onSave={(values) => saveContact({ email_addresses: values, email: values[0] || null })}
              placeholder="Add Email addresses" />
            
            </div>

            <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:gap-6">
              <div className="pt-2 text-xs text-slate-500">Phone numbers</div>
              <MultiValueInlineField
              values={phoneValues}
              onSave={(values) => saveContact({ phone_numbers: values, phone: values[0] || null })}
              placeholder="Add Phone numbers" />
            
            </div>

            <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:gap-6">
              <div className="pt-2 text-xs text-slate-500">Description</div>
              <InlineTextDetailField
              value={contact.description}
              onSave={(value) => saveContact({ description: value })}
              placeholder="Add Description"
              multiline />
            
            </div>

            <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:gap-6">
              <div className="pt-2 text-xs text-slate-500">Department</div>
              <InlineTextDetailField
              value={contact.role_department}
              onSave={(value) => saveContact({ role_department: value })}
              placeholder="Add Department" />
            
            </div>

            <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:gap-6">
              <div className="pt-2 text-xs text-slate-500">LinkedIn</div>
              <InlineTextDetailField
              value={contact.linkedin}
              onSave={(value) => saveContact({ linkedin: value })}
              placeholder="Add LinkedIn"
              isLink />
            
            </div>
          </div>

          <div className="-mx-4 mt-3">
            <ContactOrganizationsList organizations={organizations} />
          </div>

          <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
            Created {contact.created_date ? format(new Date(contact.created_date), "MMM d, yyyy") : "—"}
            {contact.created_by ? ` · by ${contact.created_by.split("@")[0]}` : ""}
          </div>
        </div> :
      null}
    </div>);

}