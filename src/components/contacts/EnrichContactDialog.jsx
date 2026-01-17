import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EnrichContactDialog({ open, onOpenChange, contact, organization, onSave }) {
  const [enrichedData, setEnrichedData] = useState(null);
  const [selectedFields, setSelectedFields] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEnrich = async () => {
    setIsLoading(true);
    setError(null);

    const prompt = `Find and enrich contact information for:
    
Name: ${contact.name}
Current Title: ${contact.title || "Unknown"}
Organization: ${organization.organization_name}
Organization Location: ${organization.city}, ${organization.state}
Organization Website: ${organization.website || "Not provided"}

Please search for this person and find:
1. Correct/current job title
2. Email address (if publicly available)
3. Phone number (direct or extension)
4. LinkedIn profile URL (only if verified - do NOT create or construct URLs)
5. Department/role information
6. Any recent updates or changes to their position

Return ONLY verified public information. For LinkedIn URL, if you cannot find a verified URL, set it to null.
Do not make up or guess any information.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            linkedin: { type: ["string", "null"] },
            role_department: { type: ["string", "null"] },
          },
        },
      });

      console.log('Contact object:', contact);
      console.log('Enrichment result:', result);
      console.log('Result keys:', Object.keys(result));
      console.log('Result values:', Object.values(result));

      setEnrichedData(result);
      setSelectedFields({});
    } catch (err) {
      console.error("Enrichment failed:", err);
      setError("Failed to enrich contact information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleField = (field) => {
    setSelectedFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {};
      Object.keys(selectedFields).forEach(field => {
        if (selectedFields[field] && enrichedData[field]) {
          updates[field] = enrichedData[field];
        }
      });

      if (Object.keys(updates).length > 0) {
        await base44.entities.Contact.update(contact.id, updates);
        onSave(updates);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Save failed:", err);
      setError("Failed to save contact information. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Enrich Contact: {contact.name}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!enrichedData && !isLoading && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Click the button below to search public sources and find updated information for this contact.
            </p>
            <Button
              onClick={handleEnrich}
              className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Search Public Sources
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Searching for updated information...</p>
              <div className="text-sm text-slate-400 mt-3 space-y-1">
                <p>• Checking LinkedIn profiles</p>
                <p>• Searching organization websites</p>
                <p>• Verifying contact details</p>
                <p className="pt-2 text-xs">This may take 10-15 seconds</p>
              </div>
            </div>
          </div>
        )}

        {enrichedData && !isLoading && (
          <div className="space-y-4">
            {Object.keys(enrichedData).some(key => enrichedData[key] && enrichedData[key] !== contact[key]) ? (
              <>
                <p className="text-sm text-slate-600 font-medium">Select fields to update:</p>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {enrichedData.title && enrichedData.title !== contact.title && (
                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={selectedFields.title || false}
                        onCheckedChange={() => handleToggleField('title')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-500 mb-1">Title</p>
                        <p className="text-sm text-slate-600 line-through">{contact.title || "Not set"}</p>
                        <p className="text-sm text-indigo-600 font-medium">{enrichedData.title}</p>
                      </div>
                    </label>
                  )}

                  {enrichedData.email && enrichedData.email !== contact.email && (
                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={selectedFields.email || false}
                        onCheckedChange={() => handleToggleField('email')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
                        <p className="text-sm text-slate-600 line-through">{contact.email || "Not set"}</p>
                        <p className="text-sm text-indigo-600 font-medium">{enrichedData.email}</p>
                      </div>
                    </label>
                  )}

                  {enrichedData.phone && enrichedData.phone !== contact.phone && (
                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={selectedFields.phone || false}
                        onCheckedChange={() => handleToggleField('phone')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-500 mb-1">Phone</p>
                        <p className="text-sm text-slate-600 line-through">{contact.phone || "Not set"}</p>
                        <p className="text-sm text-indigo-600 font-medium">{enrichedData.phone}</p>
                      </div>
                    </label>
                  )}

                  {enrichedData.linkedin && enrichedData.linkedin !== contact.linkedin && (
                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={selectedFields.linkedin || false}
                        onCheckedChange={() => handleToggleField('linkedin')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-500 mb-1">LinkedIn</p>
                        <p className="text-sm text-slate-600 line-through">{contact.linkedin || "Not set"}</p>
                        <p className="text-sm text-indigo-600 font-medium break-all">{enrichedData.linkedin}</p>
                      </div>
                    </label>
                  )}

                  {enrichedData.role_department && enrichedData.role_department !== contact.role_department && (
                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={selectedFields.role_department || false}
                        onCheckedChange={() => handleToggleField('role_department')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-500 mb-1">Department</p>
                        <p className="text-sm text-slate-600 line-through">{contact.role_department || "Not set"}</p>
                        <p className="text-sm text-indigo-600 font-medium">{enrichedData.role_department}</p>
                      </div>
                    </label>
                  )}
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium mb-1">No new information found</p>
                <p className="text-sm text-slate-400">We searched public sources but didn't find any updates different from the current contact information. The contact details appear to be up to date.</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          {enrichedData && !isLoading && (
            <Button
              onClick={handleSave}
              disabled={isSaving || Object.values(selectedFields).every(v => !v)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
          {!enrichedData && !isLoading && (
            <Button
              onClick={handleEnrich}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Search
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}