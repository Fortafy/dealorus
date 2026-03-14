import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, Linkedin, Star, Plus, Edit2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import ContactForm from "@/components/contacts/ContactForm";

export default function ContactsPanel({ organization, clientId, isCollapsed }) {
  const queryClient = useQueryClient();
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", organization.id],
    queryFn: () => base44.entities.Contact.filter({ organization_id: organization.id }, "-created_date"),
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
      toast.success("Contact updated");
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
      toast.success("Contact deleted");
    },
  });

  const handleSetPrimary = async (contact) => {
    // Remove primary from all other contacts
    const updates = contacts.map((c) =>
      c.id === contact.id
        ? { ...c, is_primary_contact: true }
        : { ...c, is_primary_contact: false }
    );

    for (const updated of updates) {
      if (updated.id !== contact.id || updated.is_primary_contact !== contact.is_primary_contact) {
        await base44.entities.Contact.update(updated.id, {
          is_primary_contact: updated.is_primary_contact,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
  };

  const handleSetBusiness = async (contact) => {
    // Remove business from all other contacts
    const updates = contacts.map((c) =>
      c.id === contact.id
        ? { ...c, is_business_contact: true }
        : { ...c, is_business_contact: false }
    );

    for (const updated of updates) {
      if (updated.id !== contact.id || updated.is_business_contact !== contact.is_business_contact) {
        await base44.entities.Contact.update(updated.id, {
          is_business_contact: updated.is_business_contact,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
  };

  if (isCollapsed) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Contacts ({contacts.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingContact(null);
              setShowContactForm(true);
            }}
            style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
            className="text-white hover:opacity-90 h-7 px-2"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Contact
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No contacts yet</p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-900">{contact.name}</h4>
                    {contact.title && <p className="text-xs text-slate-600">{contact.title}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingContact(contact);
                        setShowContactForm(true);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteContactMutation.mutate(contact.id)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {contact.is_primary_contact && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">Primary</Badge>
                  )}
                  {contact.is_business_contact && (
                    <Badge className="bg-purple-100 text-purple-800 text-xs">Decision Maker</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-2 text-xs">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-slate-600 hover:text-blue-600">
                      <Mail className="w-3 h-3" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-slate-600 hover:text-blue-600">
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </a>
                  )}
                  {contact.linkedin && (
                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-600 hover:text-blue-600">
                      <Linkedin className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleSetPrimary(contact)}
                    className={`text-xs ${contact.is_primary_contact ? "bg-blue-50 border-blue-300" : ""}`}
                  >
                    {contact.is_primary_contact ? "★ Primary" : "☆ Set Primary"}
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleSetBusiness(contact)}
                    className={`text-xs ${contact.is_business_contact ? "bg-purple-50 border-purple-300" : ""}`}
                  >
                    {contact.is_business_contact ? "✓ Decision Maker" : "Set Decision Maker"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {showContactForm && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <ContactForm
            contact={editingContact}
            organization={organization}
            clientId={clientId}
            onClose={() => {
              setShowContactForm(false);
              setEditingContact(null);
            }}
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
              setShowContactForm(false);
              setEditingContact(null);
            }}
          />
        </div>
      )}
    </Card>
  );
}