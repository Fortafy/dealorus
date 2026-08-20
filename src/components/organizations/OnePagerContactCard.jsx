import React from "react";
import { Briefcase, Linkedin, Mail, Phone, UserRound } from "lucide-react";

export default function OnePagerContactCard({ title, contact }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      {contact ? (
        <div className="mt-4 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{contact.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{contact.title || contact.role_department || "No title added"}</p>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" />{contact.role_department || "Contact"}</div>
            {contact.email ? <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-blue-600"><Mail className="h-4 w-4 text-slate-400" />{contact.email}</a> : null}
            {contact.phone ? <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-blue-600"><Phone className="h-4 w-4 text-slate-400" />{contact.phone}</a> : null}
            {contact.linkedin ? <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-600"><Linkedin className="h-4 w-4 text-slate-400" />LinkedIn</a> : null}
            {contact.source ? <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-slate-400" />{contact.source}</div> : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          No contact selected yet.
        </div>
      )}
    </div>
  );
}