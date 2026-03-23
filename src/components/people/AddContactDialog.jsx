import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddContactDialog({ open, onOpenChange, clientId, onSaved }) {
  const [form, setForm] = useState({
    name: "", title: "", email: "", phone: "",
    linkedin: "", role_department: "",
    organization_id: "",
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-for-picker", clientId],
    enabled: !!clientId && open,
    queryFn: () => base44.entities.Organization.filter({ client_id: clientId }, "organization_name"),
  });

  useEffect(() => {
    if (open) {
      setForm({ name: "", title: "", email: "", phone: "", linkedin: "", role_department: "", organization_id: "" });
    }
  }, [open]);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const contact = await base44.entities.Contact.create({
      ...form,
      client_id: clientId,
      organization_id: form.organization_id || null,
      source: "Manual",
      last_modified: new Date().toISOString(),
    });
    onSaved(contact);
    onOpenChange(false);
  };

  const inputCls = "h-8 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Name *</Label>
              <Input className={inputCls} value={form.name} onChange={e => update("name", e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input className={inputCls} value={form.title} onChange={e => update("title", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Input className={inputCls} value={form.role_department} onChange={e => update("role_department", e.target.value)} placeholder="e.g. Executive" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input className={inputCls} type="email" value={form.email} onChange={e => update("email", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className={inputCls} value={form.phone} onChange={e => update("phone", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">LinkedIn URL</Label>
              <Input className={inputCls} value={form.linkedin} onChange={e => update("linkedin", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Organization (optional)</Label>
              <select
                value={form.organization_id}
                onChange={e => update("organization_id", e.target.value)}
                className="w-full h-8 px-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">No organization</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.organization_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: 'white' }}>Add Contact</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}