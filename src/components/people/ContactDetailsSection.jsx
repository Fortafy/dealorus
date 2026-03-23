import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, ExternalLink, FileText, Globe, Mail, Pencil, Phone, Star, Users } from "lucide-react";
import { format } from "date-fns";
import ContactOrganizationsList from "@/components/people/ContactOrganizationsList";

export default function ContactDetailsSection({ contact, organizations = [], onSaved }) {
  const [isOpen, setIsOpen] = useState(true);


  const saveField = async (field, value) => {
    const updatedContact = {
      ...contact,
      [field]: value,
      last_modified: new Date().toISOString(),
    };

    await base44.entities.Contact.update(contact.id, updatedContact);
    onSaved(updatedContact);
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
        <div className="px-4 py-3">
          <div className="grid gap-x-6 md:grid-cols-2">
            <div>
              <EditableField icon={Mail} label="Email" value={contact.email} onSave={(value) => saveField("email", value)} isEmail placeholder="Email address..." />
              <EditableField icon={Phone} label="Phone" value={contact.phone} onSave={(value) => saveField("phone", value)} placeholder="Phone number..." />
              <EditableField icon={Users} label="Department" value={contact.role_department} onSave={(value) => saveField("role_department", value)} placeholder="Department..." />
            </div>
            <div>
              <EditableField icon={Globe} label="LinkedIn" value={contact.linkedin} onSave={(value) => saveField("linkedin", value)} isLink placeholder="LinkedIn URL..." />
              <EditableBooleanField icon={Star} label="Primary Contact" value={contact.is_primary_contact} onSave={(value) => saveField("is_primary_contact", value)} />
              <EditableBooleanField icon={Users} label="Business Contact" value={contact.is_business_contact} onSave={(value) => saveField("is_business_contact", value)} />
            </div>
          </div>

          <EditableField icon={FileText} label="Notes" value={contact.notes} onSave={(value) => saveField("notes", value)} multiline placeholder="Click to add notes..." />

          <div className="-mx-4 mt-3">
            <ContactOrganizationsList organizations={organizations} />
          </div>

          <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
            Created {contact.created_date ? format(new Date(contact.created_date), "MMM d, yyyy") : "—"}
            {contact.created_by ? ` · by ${contact.created_by.split("@")[0]}` : ""}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, isEmail, isLink, multiline = false, placeholder = "Click to add..." }) {
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div className="group flex items-start gap-2 border-b border-slate-100 py-2 last:border-0">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: "hsl(214, 95%, 93%)" }}>
        <Icon className="h-3.5 w-3.5" style={{ color: "hsl(217, 91%, 60%)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {hasValue ? (
          isEmail ? (
            <a href={`mailto:${value}`} className="text-xs text-blue-600 hover:underline">{value}</a>
          ) : isLink ? (
            <a href={value} target="_blank" rel="noreferrer" className="flex break-all items-center gap-1 text-xs text-blue-600 hover:underline">
              {value.replace(/^https?:\/\/(www\.)?/, "")}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          ) : multiline ? (
            <p className="whitespace-pre-wrap text-xs text-slate-800">{value}</p>
          ) : (
            <p className="break-words text-xs text-slate-800">{value}</p>
          )
        ) : (
          <p className="text-xs italic text-slate-400">{placeholder}</p>
        )}
      </div>
    </div>
  );
}