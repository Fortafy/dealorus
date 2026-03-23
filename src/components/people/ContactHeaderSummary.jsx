import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Linkedin, Mail, MoreHorizontal, Sparkles, Star, Trash2, Upload } from "lucide-react";
import InlineContactHeaderField from "@/components/people/InlineContactHeaderField";

export default function ContactHeaderSummary({
  contact,
  organization,
  onEnrich,
  onSync,
  onDelete,
  onSaved,
  isSyncing
}) {
  const initials = contact.name?.
  split(" ").
  map((part) => part[0]).
  join("").
  slice(0, 2).
  toUpperCase() || "?";

  const linkedInUrl = contact.linkedin ?
  contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}` :
  null;

  const saveField = async (field, value) => {
    const updatedContact = {
      ...contact,
      [field]: value,
      last_modified: new Date().toISOString()
    };

    await base44.entities.Contact.update(contact.id, updatedContact);
    onSaved(updatedContact);
  };

  return (
    <div className="border-b border-slate-100 bg-white px-4 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600">
            {initials}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start gap-2">
              <InlineContactHeaderField
                value={contact.name}
                onSave={(value) => saveField("name", value)}
                placeholder="Click to add name..."
                textClassName="truncate rounded px-1 -ml-1 text-left text-base font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                inputClassName="h-8 text-base font-semibold" />
              
              {contact.starred && <Star className="mt-0.5 h-4 w-4 flex-shrink-0 fill-amber-400 text-amber-400" />}
            </div>

            <InlineContactHeaderField
              value={contact.title}
              onSave={(value) => saveField("title", value)}
              placeholder="Click to add title..."
              textClassName="mt-1 truncate rounded px-1 -ml-1 text-left text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100"
              inputClassName="mt-1 h-7 text-[11px] font-medium" />

            <div className="mt-2 flex items-center gap-2">
              {contact.email ?
              <a
                href={`mailto:${contact.email}`}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-600"
                title="Email">
                
                  <Mail className="h-3.5 w-3.5" />
                </a> :
              null}
              {linkedInUrl ?
              <a
                href={linkedInUrl}
                target="_blank"
                rel="noreferrer" className="bg-blue-600 text-slate-500 rounded-full flex h-7 w-7 items-center justify-center border border-slate-200 transition-colors hover:border-blue-200 hover:text-blue-600"

                title="LinkedIn">
                
                  <Linkedin className="bg-transparent text-slate-50 lucide lucide-linkedin h-3.5 w-3.5" />
                </a> :
              null}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 self-start p-0 text-slate-500 hover:text-slate-800">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEnrich}>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Enrich
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSync} disabled={!organization || isSyncing}>
              <Upload className="mr-2 h-3.5 w-3.5" />
              {isSyncing ? "Syncing..." : "Sync to CRM"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>);

}