import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Mail, User, Briefcase, Linkedin, ExternalLink, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { motion } from "framer-motion";
import ContactForm from "./ContactForm";
import ContactDetailCard from "./ContactDetailCard";

export default function ContactSearch({ organization }) {
  const [aiContacts, setAiContacts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const queryClient = useQueryClient();

  const { data: savedContacts = [] } = useQuery({
    queryKey: ["contacts", organization.id],
    queryFn: () => base44.entities.Contact.filter({ organization_id: organization.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
      setSelectedContact(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
      setSelectedContact(null);
    },
  });

  const handleSaveContact = (contactData) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: contactData });
    } else {
      createMutation.mutate(contactData);
    }
    setEditingContact(null);
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const allContacts = [...savedContacts];

  const searchContacts = async () => {
    setIsSearching(true);
    setHasSearched(false);

    const prompt = `Find contact information for key personnel at "${organization.organization_name}" located in ${organization.city ? organization.city + ', ' : ''}${organization.state}.

Search the following sources:
- Organization's website: ${organization.website || 'search for it'}
- LinkedIn profiles
- ProPublica Nonprofit Explorer
- Charity Navigator
- GuideStar/Candid
- News articles and press releases
- Public filings and reports

Find up to 5-7 key contacts including executives, board members, or department heads. For each contact, provide:
- name: Full name of the contact
- title: Their job title/position
- email: Email address if publicly available (null if not found)
- phone: Phone number if publicly available (null if not found)
- linkedin: LinkedIn profile URL if available (null if not found)
- source: Where this information was found

Return ONLY contacts with publicly verified information. Do not make up or guess contact details.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            contacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  title: { type: "string" },
                  email: { type: ["string", "null"] },
                  phone: { type: ["string", "null"] },
                  linkedin: { type: ["string", "null"] },
                  source: { type: "string" },
                },
              },
            },
          },
        },
      });

      const foundContacts = result.contacts || [];
      
      // Save AI-found contacts to database
      for (const contact of foundContacts) {
        await base44.entities.Contact.create({
          organization_id: organization.id,
          name: contact.name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          linkedin: contact.linkedin,
          source: contact.source || "AI-found",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
      setAiContacts(foundContacts);
      setHasSearched(true);
    } catch (err) {
      console.error("Failed to search contacts:", err);
      setAiContacts([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6"
    >
      {selectedContact ? (
        <div className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedContact(null)}
          >
            ← Back to Contacts
          </Button>
          <ContactDetailCard
            contact={selectedContact}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Key Contacts</h3>
                  <p className="text-xs text-slate-500">Manage organization contacts</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddNew}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
                <Button
                  onClick={searchContacts}
                  disabled={isSearching}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  size="sm"
                >
                  {isSearching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      AI Search
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

        <div className="p-6">
          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Searching public sources...</p>
                <p className="text-sm text-slate-400 mt-1">This may take 10-15 seconds</p>
              </div>
            </div>
          )}

          {!isSearching && allContacts.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium mb-1">No contacts yet</p>
              <p className="text-sm text-slate-400">Add contacts manually or use AI search</p>
            </div>
          )}

          {!isSearching && allContacts.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Title</TableHead>
                    <TableHead className="font-semibold">Role/Dept</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Source</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allContacts.map((contact, index) => (
                    <TableRow key={contact.id || index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {contact.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.title || <span className="text-slate-400 text-sm">N/A</span>}
                      </TableCell>
                      <TableCell>
                        {contact.role_department || <span className="text-slate-400 text-sm">N/A</span>}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.phone || <span className="text-slate-400 text-sm">N/A</span>}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">{contact.source || "Manual"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedContact(contact)}
                            className="h-7 w-7 p-0"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(contact)}
                            className="h-7 w-7 p-0"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(contact.id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

        </div>
        
        <ContactForm
          contact={editingContact}
          organizationId={organization.id}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSave={handleSaveContact}
        />
      </div>
      )}
    </motion.div>
  );
}