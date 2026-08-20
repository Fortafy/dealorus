import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OrganizationContactSelect({ value, contacts = [], placeholder, onChange }) {
  const sortedContacts = [...contacts].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div>
      <Select value={value || "__none"} onValueChange={(next) => onChange(next === "__none" ? null : next)}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">None</SelectItem>
          {sortedContacts.map((contact) => (
            <SelectItem key={contact.id} value={contact.id}>
              {contact.name}{contact.title ? ` — ${contact.title}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1 text-xs text-slate-500">
        {contacts.length ? "Choose a saved contact for the one-pager." : "Add a contact first to assign this role."}
      </p>
    </div>
  );
}