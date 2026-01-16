import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Mail, User, Briefcase, Linkedin, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function ContactSearch({ organization }) {
  const [contacts, setContacts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

      setContacts(result.contacts || []);
      setHasSearched(true);
    } catch (err) {
      console.error("Failed to search contacts:", err);
      setContacts([]);
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Key Contacts</h3>
                <p className="text-xs text-slate-500">Search for publicly available contact information</p>
              </div>
            </div>
            <Button
              onClick={searchContacts}
              disabled={isSearching}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Find Contacts
                </>
              )}
            </Button>
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

          {!isSearching && hasSearched && contacts.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium mb-1">No contacts found</p>
              <p className="text-sm text-slate-400">No publicly available contact information was found</p>
            </div>
          )}

          {!isSearching && contacts.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Title</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">LinkedIn</TableHead>
                    <TableHead className="font-semibold">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {contact.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          {contact.title}
                        </div>
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
                        {contact.phone ? (
                          <span className="text-slate-700">{contact.phone}</span>
                        ) : (
                          <span className="text-slate-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.linkedin ? (
                          <a
                            href={contact.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                          >
                            <Linkedin className="w-3 h-3" />
                            View Profile
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">{contact.source}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isSearching && !hasSearched && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium mb-1">Search for Contacts</p>
              <p className="text-sm text-slate-400">Click the button above to find key personnel</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}