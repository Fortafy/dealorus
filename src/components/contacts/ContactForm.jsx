import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ContactForm({ contact, organizationId, open, onOpenChange, onSave }) {
  const [formData, setFormData] = useState(contact || {
    organization_id: organizationId,
    name: "",
    title: "",
    email: "",
    phone: "",
    linkedin: "",
    role_department: "",
    notes: "",
    source: "Manual",
  });

  // Parse source in markdown link format: [display text](url)
  const parseSource = (source) => {
    if (!source) return null;
    const match = source.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      return { text: match[1], url: match[2] };
    }
    return null;
  };

  const parsedSource = parseSource(formData.source);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Title</Label>
              <Input
                value={formData.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>

            <div>
              <Label>LinkedIn URL</Label>
              <Input
                value={formData.linkedin || ""}
                onChange={(e) => handleChange("linkedin", e.target.value)}
              />
            </div>

            <div>
              <Label>Role / Department</Label>
              <Input
                value={formData.role_department || ""}
                onChange={(e) => handleChange("role_department", e.target.value)}
                placeholder="e.g., Executive, Finance, Marketing"
              />
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                placeholder="Additional information about this contact"
              />
              {parsedSource && (
                <div className="mt-2">
                  <a
                    href={parsedSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {parsedSource.text}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {contact ? "Save Changes" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}