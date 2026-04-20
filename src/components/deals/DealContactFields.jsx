import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const emptyContactForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  title: "",
};

function splitName(contact) {
  const fullName = contact?.name || "";
  const [firstName = "", ...rest] = fullName.trim().split(" ");
  return {
    first_name: contact?.first_name || firstName,
    last_name: contact?.last_name || rest.join(" "),
  };
}

function buildContactName(contact) {
  const parts = [splitName(contact).first_name, splitName(contact).last_name].filter(Boolean);
  return parts.join(" ") || contact?.name || "Unnamed Contact";
}

function contactToForm(contact) {
  const { first_name, last_name } = splitName(contact || {});
  return {
    first_name,
    last_name,
    email: contact?.email || "",
    phone: contact?.phone || "",
    title: contact?.title || "",
  };
}

function ContactDetailsCard({ contact, onEdit }) {
  if (!contact) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-medium text-slate-900">{buildContactName(contact)}</p>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onEdit}>Edit</Button>
      </div>
      <div className="grid grid-cols-1 gap-1 text-slate-600 md:grid-cols-2">
        <p><span className="font-medium text-slate-800">Email:</span> {contact.email || "—"}</p>
        <p><span className="font-medium text-slate-800">Phone:</span> {contact.phone || "—"}</p>
        <p className="md:col-span-2"><span className="font-medium text-slate-800">Title:</span> {contact.title || "—"}</p>
      </div>
    </div>
  );
}

export default function DealContactFields({ organizationId, clientId, value, onChange }) {
  const queryClient = useQueryClient();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactForm, setContactForm] = useState(emptyContactForm);

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

  const administrativeContact = contacts.find((contact) => contact.id === value.administrative_contact_id) || null;
  const billingContact = contacts.find((contact) => contact.id === value.billing_contact_id) || null;

  const openCreateDialog = (role) => {
    setEditingRole(role);
    setEditingContactId(null);
    setContactForm(emptyContactForm);
    setIsContactDialogOpen(true);
  };

  const openEditDialog = (role, contact) => {
    setEditingRole(role);
    setEditingContactId(contact.id);
    setContactForm(contactToForm(contact));
    setIsContactDialogOpen(true);
  };

  const saveContact = async () => {
    const firstName = contactForm.first_name.trim();
    const lastName = contactForm.last_name.trim();
    if (!firstName || !lastName) return;

    const name = `${firstName} ${lastName}`.trim();
    const payload = {
      client_id: clientId,
      organization_id: organizationId,
      name,
      title: contactForm.title || "",
      email: contactForm.email || "",
      email_addresses: contactForm.email ? [contactForm.email] : [],
      phone: contactForm.phone || "",
      phone_numbers: contactForm.phone ? [contactForm.phone] : [],
      source: "Manual",
      description: "",
      last_modified: new Date().toISOString(),
    };

    const savedContact = editingContactId
      ? await base44.entities.Contact.update(editingContactId, payload)
      : await base44.entities.Contact.create(payload);

    await queryClient.invalidateQueries({ queryKey: ["deal-organization-contacts", organizationId] });

    if (editingRole === "administrative") {
      onChange({
        administrative_contact_id: savedContact.id,
        administrative_contact_name: buildContactName(savedContact),
      });
    }

    if (editingRole === "billing") {
      onChange({
        billing_contact_id: savedContact.id,
        billing_contact_name: buildContactName(savedContact),
      });
    }

    setIsContactDialogOpen(false);
    setEditingContactId(null);
    setEditingRole(null);
    setContactForm(emptyContactForm);
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-medium text-slate-600">Administrative Contact</label>
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openCreateDialog("administrative")}>Add Contact</Button>
            </div>
            <select
              value={value.administrative_contact_id || ""}
              onChange={(e) => updateRole("administrative_contact_id", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select administrative contact...</option>
              {contactOptions.map((contact) => (
                <option key={contact.id} value={contact.id}>{contact.name}</option>
              ))}
            </select>
            <ContactDetailsCard contact={administrativeContact} onEdit={() => openEditDialog("administrative", administrativeContact)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-medium text-slate-600">Billing Contact</label>
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openCreateDialog("billing")}>Add Contact</Button>
            </div>
            <select
              value={value.billing_contact_id || ""}
              onChange={(e) => updateRole("billing_contact_id", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select billing contact...</option>
              {contactOptions.map((contact) => (
                <option key={contact.id} value={contact.id}>{contact.name}</option>
              ))}
            </select>
            <ContactDetailsCard contact={billingContact} onEdit={() => openEditDialog("billing", billingContact)} />
          </div>
        </div>
      </div>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContactId ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">First Name</label>
              <Input value={contactForm.first_name} onChange={(e) => setContactForm((current) => ({ ...current, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Last Name</label>
              <Input value={contactForm.last_name} onChange={(e) => setContactForm((current) => ({ ...current, last_name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Email</label>
              <Input type="email" value={contactForm.email} onChange={(e) => setContactForm((current) => ({ ...current, email: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Phone</label>
              <Input value={contactForm.phone} onChange={(e) => setContactForm((current) => ({ ...current, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Title</label>
              <Input value={contactForm.title} onChange={(e) => setContactForm((current) => ({ ...current, title: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsContactDialogOpen(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={saveContact}>Save Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}