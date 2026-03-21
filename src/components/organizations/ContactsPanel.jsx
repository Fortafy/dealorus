import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, Linkedin, Star, Plus, Edit2, Trash2, Users, Search, Sparkles, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import ContactForm from "@/components/contacts/ContactForm";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import EnhancedAISearchDialog from "@/components/contacts/EnhancedAISearchDialog";
import FilterDialog from "@/components/contacts/FilterDialog";
import EnrichContactDialog from "@/components/contacts/EnrichContactDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ContactsPanel({ organization, clientId, isCollapsed }) {
  const queryClient = useQueryClient();
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState({ title: "", department: "", starredOnly: false });
  const [enrichingContactId, setEnrichingContactId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      }
    };
    fetchUser();
  }, []);

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

  const cleanLinkedInUrl = (url) => {
    if (!url || url === 'null') return null;
    try {
      let cleaned = url.split('?')[0].replace(/\/$/, '');
      const match = cleaned.match(/(https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9-]+)/i);
      if (!match) return null;
      const extractedUrl = match[1];
      const profileSlug = extractedUrl.split('/').pop();
      if (/[a-z]+-\d{8,}$/i.test(profileSlug)) {
        return null;
      }
      return extractedUrl;
    } catch {
      return null;
    }
  };

  const searchContacts = async (customCriteria = null) => {
    setIsSearching(true);

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
        const nameParts = contact.name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        
        const existingContact = contacts.find(existing => {
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
          client_id: currentUser?.client_id,
          name: contact.name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          linkedin: cleanLinkedInUrl(contact.linkedin),
          role_department: contact.role_department,
          source: contact.source || "AI-found",
        };
        
        if (existingContact) {
          await base44.entities.Contact.update(existingContact.id, contactData);
        } else {
          await base44.entities.Contact.create(contactData);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
      toast.success(`Found and saved ${foundContacts.length} contacts`);
    } catch (err) {
      console.error("Search failed:", err);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleEnrichContact = (contact) => {
    setEnrichingContactId(contact.id);
  };

  const handleEnrichSave = async (updates) => {
    queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
    setEnrichingContactId(null);
  };

  const filteredContacts = contacts.filter(contact => {
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

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    // Primary contacts first
    if (a.is_primary_contact && !b.is_primary_contact) return -1;
    if (!a.is_primary_contact && b.is_primary_contact) return 1;
    
    // Decision Makers second
    if (a.is_business_contact && !b.is_business_contact) return -1;
    if (!a.is_business_contact && b.is_business_contact) return 1;
    
    // Everyone else alphabetically by first name
    const aFirstName = a.name?.split(' ')[0]?.toLowerCase() || '';
    const bFirstName = b.name?.split(' ')[0]?.toLowerCase() || '';
    return aFirstName.localeCompare(bFirstName);
  });

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="py-2.5 px-4 bg-slate-50 border-b border-slate-200">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 group hover:opacity-80 transition-opacity">
              <span className="text-sm font-semibold text-slate-700">
                Contacts ({filteredContacts.length})
              </span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </CollapsibleTrigger>
            <TooltipProvider>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => { setEditingContact(null); setShowContactForm(true); }}
                      style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
                      className="text-white hover:opacity-90 h-7 px-2"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add Contact</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => setShowFilterDialog(true)} variant="outline" size="sm" className="h-7 px-2">
                      <Filter className="w-3 h-3" />
                      {Object.values(filters).some(v => v) && <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Filter</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => setShowAdvancedSearch(true)} disabled={isSearching} variant="outline" size="sm" className="h-7 px-2">
                      {isSearching ? <div className="w-3 h-3 border-2 border-slate-300/50 border-t-slate-600 rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Advanced Search</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => searchContacts()} disabled={isSearching} size="sm" className="h-7 px-2 text-white" style={{ backgroundColor: "hsl(217, 91%, 60%)" }}>
                      {isSearching ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-3 h-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Quick Search</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </Collapsible>
      </div>

      {isOpen && <div className="p-0">
        {isSearching && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Searching public sources...</p>
              <p className="text-sm text-slate-400 mt-1">This may take 10-15 seconds</p>
            </div>
          </div>
        )}

        {!isSearching && filteredContacts.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No contacts yet</p>
        ) : !isSearching && (
          <div className="divide-y divide-slate-200">
            {sortedContacts.map((contact) => (
              <div key={contact.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
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
                      onClick={() => setContactToDelete(contact)}
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
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleEnrichContact(contact)}
                    className="text-xs"
                  >
                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                    Enrich
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>}

        <ContactForm
        contact={editingContact}
        organizationId={organization.id}
        clientId={currentUser?.client_id}
        open={showContactForm}
        onOpenChange={setShowContactForm}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["contacts", organization.id] });
          setShowContactForm(false);
          setEditingContact(null);
        }}
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
          contact={contacts.find(c => c.id === enrichingContactId)}
          organization={organization}
          onSave={handleEnrichSave}
          />
          )}

          <AlertDialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {contactToDelete?.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3 justify-end">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteContactMutation.mutate(contactToDelete.id);
                    setContactToDelete(null);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
          </Card>
          );
          }