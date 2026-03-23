import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, ExternalLink, Pencil } from "lucide-react";
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
    <div className="border-b border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger
            asChild
            onClick={() => setIsOpen((current) => !current)}
          >
            <button className="flex flex-1 items-center justify-between text-left hover:opacity-80 transition-opacity">
              <span className="text-sm font-semibold text-slate-700">Contact Details</span>
              {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
          </CollapsibleTrigger>
          {!editing ? (
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />Edit
            </Button>
          ) : null}
        </div>
      </div>

      {isOpen && (
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
            <div className="space-y-1">
              <InfoRow label="Email" value={contact.email} isEmail />
              <InfoRow label="Phone" value={contact.phone} />
              <InfoRow label="Department" value={contact.role_department} />
              <InfoRow label="LinkedIn" value={contact.linkedin} isLink />
              <InfoRow label="Primary Contact" value={contact.is_primary_contact ? "Yes" : "No"} />
              <InfoRow label="Business Contact" value={contact.is_business_contact ? "Yes" : "No"} />
              {contact.notes ? (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-600">{contact.notes}</p>
                </div>
              ) : null}
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
                Created {contact.created_date ? format(new Date(contact.created_date), "MMM d, yyyy") : "—"}
                {contact.created_by ? ` · by ${contact.created_by.split("@")[0]}` : ""}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, isEmail, isLink }) {
  if (!value && value !== "No") return null;

  return (
    <div className="flex items-start gap-3 border-b border-slate-50 py-2 last:border-0">
      <span className="w-32 flex-shrink-0 pt-0.5 text-xs font-medium text-slate-400">{label}</span>
      {isEmail ? (
        <a href={`mailto:${value}`} className="text-sm text-blue-600 hover:underline">{value}</a>
      ) : isLink ? (
        <a href={value} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          {value.replace(/^https?:\/\/(www\.)?/, "")}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-sm text-slate-700">{value}</span>
      )}
    </div>
  );
}