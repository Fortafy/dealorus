import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, ExternalLink, FileText, Globe, Mail, Pencil, Phone, Star, Users } from "lucide-react";
import { format } from "date-fns";

export default function ContactDetailsSection({ contact, onSaved }) {
  const [isOpen, setIsOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(contact);

  useEffect(() => {
    setForm(contact);
  }, [contact]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    const updatedContact = {
      ...form,
      last_modified: new Date().toISOString(),
    };

    await base44.entities.Contact.update(contact.id, updatedContact);
    onSaved(updatedContact);
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <button
          className="flex flex-1 items-center justify-between text-left transition-opacity hover:opacity-80"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="text-sm font-semibold text-slate-700">Contact Details</span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {!editing ? (
          <Button size="sm" variant="outline" className="ml-3 h-6 gap-1 px-2 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />Edit
          </Button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="px-4 py-3">
          {editing && form ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input className="mt-1 h-8 text-sm" value={form.name || ""} onChange={(e) => update("name", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input className="mt-1 h-8 text-sm" value={form.title || ""} onChange={(e) => update("title", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input className="mt-1 h-8 text-sm" value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input className="mt-1 h-8 text-sm" value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">LinkedIn</Label>
                  <Input className="mt-1 h-8 text-sm" value={form.linkedin || ""} onChange={(e) => update("linkedin", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Department</Label>
                  <Input className="mt-1 h-8 text-sm" value={form.role_department || ""} onChange={(e) => update("role_department", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea className="mt-1 text-sm" rows={4} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => { setForm(contact); setEditing(false); }}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-x-6 md:grid-cols-2">
                <div>
                  <InfoRow icon={Mail} label="Email" value={contact.email} isEmail placeholder="Email address..." />
                  <InfoRow icon={Phone} label="Phone" value={contact.phone} placeholder="Phone number..." />
                  <InfoRow icon={Users} label="Department" value={contact.role_department} placeholder="Department..." />
                </div>
                <div>
                  <InfoRow icon={Globe} label="LinkedIn" value={contact.linkedin} isLink placeholder="LinkedIn URL..." />
                  <InfoRow icon={Star} label="Primary Contact" value={contact.is_primary_contact ? "Yes" : "No"} />
                  <InfoRow icon={Users} label="Business Contact" value={contact.is_business_contact ? "Yes" : "No"} />
                </div>
              </div>

              <InfoRow icon={FileText} label="Notes" value={contact.notes} multiline placeholder="Click to add notes..." />

              <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
                Created {contact.created_date ? format(new Date(contact.created_date), "MMM d, yyyy") : "—"}
                {contact.created_by ? ` · by ${contact.created_by.split("@")[0]}` : ""}
              </div>
            </>
          )}
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