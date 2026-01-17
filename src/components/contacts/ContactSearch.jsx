import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Search, Mail, User, Briefcase, Linkedin, ExternalLink, Plus, Pencil, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Star, Filter, Upload, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ContactForm from "./ContactForm";
import ContactDetailCard from "./ContactDetailCard";
import CSVContactUploader from "./CSVContactUploader";
import FilterDialog from "./FilterDialog";
import BulkEditDialog from "./BulkEditDialog";
import EnhancedAISearchDialog from "./EnhancedAISearchDialog";
import EnrichContactDialog from "./EnrichContactDialog";

export default function ContactSearch({ organization }) {
  const [aiContacts, setAiContacts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState({ title: "", department: "", starredOnly: false });
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [enrichingContactId, setEnrichingContactId] = useState(null);
  const queryClient = useQueryClient();

  const { data: savedContacts = [] } = useQuery({
    queryKey: ["contacts", organization.id],
    queryFn: async () => {
      const contacts = await base44.entities.Contact.filter({ organization_id: organization.id });
      
      // Fetch all unique organization IDs
      const orgIds = [...new Set(contacts.map(c => c.organization_id))];
      const organizations = await Promise.all(
        orgIds.map(id => base44.entities.SearchResult.list().then(orgs => orgs.find(o => o.id === id)))
      );
      
      // Create a map of org ID to org name
      const orgMap = {};
      organizations.forEach(org => {
        if (org) orgMap[org.id] = org.organization_name;
      });
      
      // Add company name to each contact
      return contacts.map(contact => ({
        ...contact,
        company: orgMap[contact.organization_id] || 'Unknown'
      }));
    },
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

  const starMutation = useMutation({
    mutationFn: ({ id, starred }) => base44.entities.Contact.update(id, { starred }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
    },
  });

  const handleEnrichContact = (contact) => {
    setEnrichingContactId(contact.id);
  };

  const handleEnrichSave = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
    setEnrichingContactId(null);
  };

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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedContacts(new Set(savedContacts.map(c => c.id)));
    } else {
      setSelectedContacts(new Set());
    }
  };

  const handleSelectContact = (contactId, checked) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;
    if (!confirm(`Delete ${selectedContacts.size} contact${selectedContacts.size > 1 ? 's' : ''}?`)) return;

    for (const contactId of selectedContacts) {
      await deleteMutation.mutateAsync(contactId);
    }
    setSelectedContacts(new Set());
  };

  const handleBulkEdit = async (updates) => {
    if (selectedContacts.size === 0) return;

    for (const contactId of selectedContacts) {
      await base44.entities.Contact.update(contactId, updates);
    }
    queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
    setSelectedContacts(new Set());
  };

  const filteredBySearch = savedContacts.filter(contact => {
    if (filters.title && !contact.title?.toLowerCase().includes(filters.title.toLowerCase())) {
      return false;
    }
    if (filters.department && !contact.role_department?.toLowerCase().includes(filters.department.toLowerCase())) {
      return false;
    }
    if (filters.starredOnly && !contact.starred) {
      return false;
    }
    return true;
  });

  const sortedContacts = [...filteredBySearch].sort((a, b) => {
    if (!sortField) return 0;
    
    const aVal = a[sortField] || "";
    const bVal = b[sortField] || "";
    
    const comparison = aVal.toString().localeCompare(bVal.toString(), undefined, { numeric: true });
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const allContacts = sortedContacts;

  const cleanLinkedInUrl = (url) => {
    if (!url || url === 'null') return null;
    try {
      // Remove trailing slashes and query parameters
      let cleaned = url.split('?')[0].replace(/\/$/, '');
      
      // Extract the core profile path (e.g., /in/name or /company/name)
      const match = cleaned.match(/(https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9-]+)/i);
      if (!match) return null;
      
      const extractedUrl = match[1];
      
      // Reject URLs with sequential numbers or suspicious patterns
      const profileSlug = extractedUrl.split('/').pop();
      // Check for patterns like "name-12345678" or "name-34567890"
      if (/[a-z]+-\d{8,}$/i.test(profileSlug)) {
        return null; // Reject URLs ending with hyphen and 8+ digits
      }
      
      return extractedUrl;
    } catch {
      return null;
    }
  };

  const searchContacts = async (customCriteria = null) => {
    setIsSearching(true);
    setHasSearched(false);

    let searchScope = customCriteria || `key personnel at "${organization.organization_name}" located in ${organization.city ? organization.city + ', ' : ''}${organization.state}`;
    
    const prompt = `Find contact information for ${searchScope}.

ORGANIZATION CONTEXT (use this to cross-reference and validate contact information):
- Website: ${organization.website || 'unknown'}
- Organization Email: ${organization.email || 'unknown'}
- Organization Phone: ${organization.phone || 'unknown'}
- Address: ${organization.address || 'unknown'}
- EIN: ${organization.ein || 'unknown'}

PRIORITIZED ROLES TO SEARCH FOR:
1. Executive Leadership: CEO, Executive Director, President, COO, CFO
2. Development/Fundraising: Director of Development, Fundraising Manager, Grants Manager
3. Program Management: Program Director, Operations Manager
4. Communications: Communications Director, Marketing Director
5. Board Members: Board Chair, Board Members

SEARCH STRATEGY:
- Use the organization's domain from website/email to find employee email patterns
- Cross-reference phone numbers and email domains with organization data
- Look for staff/team pages on the organization's website
- Search LinkedIn for employees at this specific organization
- Check ProPublica Nonprofit Explorer, Charity Navigator, GuideStar for leadership
- Review news articles, press releases, and public filings for names and titles

Find up to 7-10 key contacts. For each contact, provide:
- name: Full name of the contact
- title: Their specific job title/position
- email: Email address if publicly available (cross-reference with org domain if possible)
- phone: Direct phone number or extension if available
- linkedin: LinkedIn profile URL ONLY if you have verified it exists. If you cannot find a verified URL, set this to null (leave blank).
- role_department: Their department or functional area (e.g., "Development", "Programs", "Executive")
- source: Specific source where this information was found (include URL if possible)

EXTREMELY CRITICAL - LinkedIn URL Rules (READ CAREFULLY):
- DO NOT create, construct, or generate LinkedIn URLs
- DO NOT add ANY numbers, suffixes, or identifiers to LinkedIn URLs
- DO NOT append sequential numbers like -12345678 or -34567890 to URLs
- ONLY provide a LinkedIn URL if you have ACTUALLY FOUND it from a verified source
- If you cannot find the exact verified LinkedIn URL, you MUST set linkedin to null (blank/empty)
- Valid example: https://www.linkedin.com/in/john-smith (NO numbers or suffixes)
- Invalid examples: https://www.linkedin.com/in/john-smith-12345678 or any URL with appended numbers
- When in doubt, set linkedin to null - DO NOT GUESS

VALIDATION: Cross-check found email addresses and phone numbers against the organization's known domain/contact info to ensure accuracy.

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
                  role_department: { type: ["string", "null"] },
                  source: { type: "string" },
                },
              },
            },
          },
        },
      });

      const foundContacts = result.contacts || [];
      
      // Save AI-found contacts to database, checking for duplicates
      for (const contact of foundContacts) {
        // Split name into first and last name for duplicate checking
        const nameParts = contact.name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        
        // Check for existing contact with same first name, last name, and email
        const existingContact = savedContacts.find(existing => {
          const existingNameParts = existing.name.trim().split(' ');
          const existingFirstName = existingNameParts[0];
          const existingLastName = existingNameParts.length > 1 ? existingNameParts[existingNameParts.length - 1] : '';
          
          const nameMatch = existingFirstName.toLowerCase() === firstName.toLowerCase() && 
                           existingLastName.toLowerCase() === lastName.toLowerCase();
          const emailMatch = existing.email && contact.email && 
                            existing.email.toLowerCase() === contact.email.toLowerCase();
          
          return nameMatch && emailMatch;
        });
        
        const contactData = {
          organization_id: organization.id,
          name: contact.name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          linkedin: cleanLinkedInUrl(contact.linkedin),
          role_department: contact.role_department,
          source: contact.source || "AI-found",
        };
        
        if (existingContact) {
          // Update existing contact
          await base44.entities.Contact.update(existingContact.id, contactData);
        } else {
          // Create new contact
          await base44.entities.Contact.create(contactData);
        }
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
                </div>
              </div>
              <TooltipProvider>
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleAddNew}
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/90 text-indigo-700 hover:bg-white"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Contact</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-8">
                        <CSVContactUploader 
                          organizationId={organization.id}
                          onComplete={() => queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] })}
                          iconOnly={true}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Import CSV</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowFilterDialog(true)}
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/90 text-indigo-700 hover:bg-white relative"
                      >
                        <Filter className="w-4 h-4" />
                        {Object.values(filters).some(v => v) && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Filter</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowAdvancedSearch(true)}
                        disabled={isSearching}
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/90 text-indigo-700 hover:bg-white"
                      >
                        {isSearching ? (
                          <div className="w-4 h-4 border-2 border-indigo-700/30 border-t-indigo-700 rounded-full animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Advanced Search</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => searchContacts()}
                        disabled={isSearching}
                        size="sm"
                        className="h-8 w-8 p-0 bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        {isSearching ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Quick Search</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
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
            <>
              {selectedContacts.size > 0 && (
                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-900">
                    {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkEdit(true)}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    >
                      Edit Selected
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedContacts.size === allContacts.length && allContacts.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer text-sm" onClick={() => handleSort("name")}>
                        <div className="flex items-center gap-1">
                          Name
                          {sortField === "name" ? (
                            sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer text-sm" onClick={() => handleSort("title")}>
                        <div className="flex items-center gap-1">
                          Title
                          {sortField === "title" ? (
                            sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer text-sm" onClick={() => handleSort("email")}>
                        <div className="flex items-center gap-1">
                          Email
                          {sortField === "email" ? (
                            sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-sm">Phone</TableHead>
                      <TableHead className="font-semibold text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allContacts.map((contact, index) => (
                      <TableRow key={contact.id || index}>
                          <TableCell>
                            <Checkbox
                              checked={selectedContacts.has(contact.id)}
                              onCheckedChange={(checked) => handleSelectContact(contact.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => starMutation.mutate({ id: contact.id, starred: !contact.starred })}
                                className="hover:opacity-70 transition-opacity"
                                title={contact.starred ? "Unstar" : "Star"}
                              >
                                <Star className={`w-4 h-4 ${contact.starred ? "fill-yellow-400 text-yellow-400" : "text-slate-400"}`} />
                              </button>
                              {contact.name}
                            </div>
                          </TableCell>
                        <TableCell className="text-sm">
                          {contact.title || <span className="text-slate-400">N/A</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {contact.email ? (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {contact.phone ? (
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              {contact.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEnrichContact(contact)}
                              className="h-7 w-7 p-0"
                              title="AI Enrich"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            </Button>
                            {contact.linkedin ? (
                              <a
                                href={contact.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-slate-100 transition-colors"
                                title="LinkedIn Profile"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              </a>
                            ) : (
                              <div className="inline-flex items-center justify-center h-7 w-7">
                                <Eye className="w-3.5 h-3.5 text-slate-300" />
                              </div>
                            )}
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
            </>
          )}

        </div>
        
        <ContactForm
          contact={editingContact}
          organizationId={organization.id}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSave={handleSaveContact}
        />

        <BulkEditDialog
          open={showBulkEdit}
          onOpenChange={setShowBulkEdit}
          selectedCount={selectedContacts.size}
          onApply={handleBulkEdit}
        />

        <EnhancedAISearchDialog
          open={showAdvancedSearch}
          onOpenChange={setShowAdvancedSearch}
          onSearch={searchContacts}
        />

        <FilterDialog
          open={showFilterDialog}
          onOpenChange={setShowFilterDialog}
          onFilterChange={setFilters}
          currentFilters={filters}
        />

        {enrichingContactId && (
          <EnrichContactDialog
            open={!!enrichingContactId}
            onOpenChange={(open) => !open && setEnrichingContactId(null)}
            contact={savedContacts.find(c => c.id === enrichingContactId)}
            organization={organization}
            onSave={handleEnrichSave}
          />
        )}
      </div>
      )}
    </motion.div>
  );
}