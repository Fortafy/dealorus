import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import ActivityFeed from "./ActivityFeed";

export default function ContactForm({ contact, organizationId, clientId, open, onOpenChange, onSave }) {
  const [formData, setFormData] = useState(contact || {
    organization_id: organizationId,
    client_id: clientId,
    name: "",
    title: "",
    email: "",
    phone: "",
    linkedin: "",
    role_department: "",
    source: "Manual",
  });

  useEffect(() => {
    if (contact) {
      setFormData(contact);
    } else {
      setFormData({
        organization_id: organizationId,
        client_id: clientId,
        name: "",
        title: "",
        email: "",
        phone: "",
        linkedin: "",
        role_department: "",
        source: "Manual",
      });
    }
  }, [contact, organizationId, clientId]);

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
    if (!formData.name?.trim()) {
      return;
    }
    onSave({
      ...formData,
      last_modified: new Date().toISOString()
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
        </DialogHeader>

        {contact && (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
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

                  <div className="col-span-2 mt-2 flex items-center justify-between">
                    <div>
                      {parsedSource && (
                        <div>
                          <span className="text-xs text-slate-500">Original Source: </span>
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
                    {contact?.last_modified && (
                      <div className="text-xs text-slate-500">
                        Last Modified: {format(new Date(contact.last_modified), "MMM d, yyyy h:mm a")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                    Save Changes
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <ActivityFeed contactId={contact.id} />
            </TabsContent>
          </Tabs>
        )}

        {!contact && (
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
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                Add Contact
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}