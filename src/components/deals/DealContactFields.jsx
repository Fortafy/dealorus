import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const emptyQuickContact = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  title: "",
};

function buildContactName(contact) {
  return contact?.name || [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || "Unnamed Contact";
}

export default function DealContactFields({ organizationId, clientId, value, onChange }) {
  const queryClient = useQueryClient();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickContact, setQuickContact] = useState(emptyQuickContact);

  const { data: contacts = [] } = useQuery({
    queryKey: ["deal-organization-contacts", organizationId],
    enabled: !!organizationId,
    queryFn: () => base44.entities.Contact.filter({ organization_id: organizationId }, "name"),
    initialData: [],
  });

  const contactOptions = useMemo(() => contacts.map((contact) => ({
    id: contact.id,
    name: buildContactName(contact),
  })), [contacts]);

  const handleQuickAdd = async () => {
    const firstName = quickContact.first_name.trim();
    const lastName = quickContact.last_name.trim();
    if (!firstName || !lastName) return;

    const name = `${firstName} ${lastName}`.trim();
    const createdContact = await base44.entities.Contact.create({
      client_id: clientId,
      organization_id: organizationId,
      name,
      title: quickContact.title || "",
      email: quickContact.email || "",
      email_addresses: quickContact.email ? [quickContact.email] : [],
      phone: quickContact.phone || "",
      phone_numbers: quickContact.phone ? [quickContact.phone] : [],
      source: "Manual",
      description: "",
      last_modified: new Date().toISOString(),
    });

    await queryClient.invalidateQueries({ queryKey: ["deal-organization-contacts", organizationId] });
    onChange({
      administrative_contact_id: createdContact.id,
      administrative_contact_name: createdContact.name,
      billing_contact_id: createdContact.id,
      billing_contact_name: createdContact.name,
    });
    setQuickContact(emptyQuickContact);
    setIsQuickAddOpen(false);
  };

  const updateRole = (fieldKey, selectedId) => {
    const selectedContact = contacts.find((contact) => contact.id === selectedId);
    const nameKey = fieldKey === "administrative_contact_id" ? "administrative_contact_name" : "billing_contact_name";
    onChange({
      [fieldKey]: selectedId || "",
      [nameKey]: selectedContact ? buildContactName(selectedContact) : "",
    });
  };

  if (!organizationId) return null;

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Organization Contacts</h3>
            <p className="mt-1 text-xs text-slate-500">Choose administrative and billing contacts from this organization only.</p>
          </div>
          {!contactOptions.length ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setIsQuickAddOpen(true)} className="h-8 px-3 text-xs">
              Add Contact
            </Button>
          ) : null}
        </div>

        {!contactOptions.length ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            No contacts are linked to this organization yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Administrative Contact</label>
              <select
                value={value.administrative_contact_id || ""}
                onChange={(e) => updateRole("administrative_contact_id", e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select contact...</option>
                {contactOptions.map((contact) => (
                  <option key={contact.id} value={contact.id}>{contact.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Billing Contact</label>
              <select
                value={value.billing_contact_id || ""}
                onChange={(e) => updateRole("billing_contact_id", e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select contact...</option>
                {contactOptions.map((contact) => (
                  <option key={contact.id} value={contact.id}>{contact.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Organization Contact</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">First Name</label>
              <Input value={quickContact.first_name} onChange={(e) => setQuickContact((current) => ({ ...current, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Last Name</label>
              <Input value={quickContact.last_name} onChange={(e) => setQuickContact((current) => ({ ...current, last_name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Email</label>
              <Input type="email" value={quickContact.email} onChange={(e) => setQuickContact((current) => ({ ...current, email: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Phone</label>
              <Input value={quickContact.phone} onChange={(e) => setQuickContact((current) => ({ ...current, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Title</label>
              <Input value={quickContact.title} onChange={(e) => setQuickContact((current) => ({ ...current, title: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAddOpen(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={handleQuickAdd}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}