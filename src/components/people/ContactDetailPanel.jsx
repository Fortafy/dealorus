import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, ChevronRight, ExternalLink, Star, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function ContactDetailPanel({ contactId, onClose }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact-detail", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const results = await base44.entities.Contact.filter({ id: contactId });
      return results[0] || null;
    },
  });

  const { data: organization } = useQuery({
    queryKey: ["org-for-contact", contact?.organization_id],
    enabled: !!contact?.organization_id,
    queryFn: async () => {
      const results = await base44.entities.Organization.filter({ id: contact.organization_id });
      return results[0] || null;
    },
  });

  const startEdit = () => {
    setForm({ ...contact });
    setEditing(true);
  };

  const handleSave = async () => {
    await base44.entities.Contact.update(contactId, { ...form, last_modified: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey: ["contact-detail", contactId] });
    queryClient.invalidateQueries({ queryKey: ["people"] });
    setEditing(false);
  };

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!contact) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 flex-shrink-0 text-sm text-slate-500">
        <button onClick={onClose} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
          <Users className="w-3.5 h-3.5" />
          <span>People</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-800 font-medium truncate">{contact.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Header card */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0">
              {contact.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                {contact.name}
                {contact.starred && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
              </h2>
              {contact.title && <p className="text-sm text-slate-500">{contact.title}</p>}
              {organization && (
                <p className="text-xs text-blue-600">{organization.organization_name}</p>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={startEdit}>
            <Pencil className="w-3 h-3" /> Edit
          </Button>
        </div>

        {editing && form ? (
          <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Editing Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input className="h-8 text-sm" value={form.name || ""} onChange={e => update("name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input className="h-8 text-sm" value={form.title || ""} onChange={e => update("title", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-sm" value={form.email || ""} onChange={e => update("email", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input className="h-8 text-sm" value={form.phone || ""} onChange={e => update("phone", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">LinkedIn</Label>
                <Input className="h-8 text-sm" value={form.linkedin || ""} onChange={e => update("linkedin", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <Input className="h-8 text-sm" value={form.role_department || ""} onChange={e => update("role_department", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes || ""} onChange={e => update("notes", e.target.value)} rows={3} className="text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: 'white' }}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <InfoRow label="Email" value={contact.email} isEmail />
            <InfoRow label="Phone" value={contact.phone} />
            <InfoRow label="Department" value={contact.role_department} />
            <InfoRow label="LinkedIn" value={contact.linkedin} isLink />
            <InfoRow label="Organization" value={organization?.organization_name} />
            <InfoRow label="Primary Contact" value={contact.is_primary_contact ? "Yes" : "No"} />
            <InfoRow label="Business Contact" value={contact.is_business_contact ? "Yes" : "No"} />
            {contact.notes && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
              Created {contact.created_date ? format(new Date(contact.created_date), "MMM d, yyyy") : "—"}
              {contact.created_by && ` · by ${contact.created_by.split("@")[0]}`}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoRow({ label, value, isEmail, isLink }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-medium text-slate-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      {isEmail ? (
        <a href={`mailto:${value}`} className="text-sm text-blue-600 hover:underline">{value}</a>
      ) : isLink ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          {value.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <span className="text-sm text-slate-700">{value}</span>
      )}
    </div>
  );
}