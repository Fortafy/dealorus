import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Linkedin, Mail, MoreHorizontal, Sparkles, Star, Trash2, Upload } from "lucide-react";

export default function ContactHeaderSummary({
  contact,
  organization,
  onEnrich,
  onSync,
  onDelete,
  isSyncing,
}) {
  const initials = contact.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const linkedInUrl = contact.linkedin
    ? (contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`)
    : null;

  return (
    <div className="border-b border-slate-100 bg-white px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-slate-900">{contact.name}</h2>
              {contact.starred && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
            </div>

            {contact.title ? (
              <p className="mt-1 truncate text-[11px] font-medium text-slate-500">{contact.title}</p>
            ) : null}

            <div className="mt-2 flex items-center gap-2">
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-600"
                  title="Email"
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {linkedInUrl ? (
                <a
                  href={linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-600"
                  title="LinkedIn"
                >
                  <Linkedin className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>

            {organization?.organization_name ? (
              <p className="mt-2 truncate text-xs text-blue-600">{organization.organization_name}</p>
            ) : null}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800">
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
    </div>
  );
}