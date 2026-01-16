import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function EditOrganizationDialog({ organization, open, onOpenChange, onSave }) {
  const [formData, setFormData] = useState(organization);

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Organization Name</Label>
              <Input
                value={formData.organization_name || ""}
                onChange={(e) => handleChange("organization_name", e.target.value)}
              />
            </div>

            <div>
              <Label>EIN</Label>
              <Input
                value={formData.ein || ""}
                onChange={(e) => handleChange("ein", e.target.value)}
              />
            </div>

            <div>
              <Label>Organization Type</Label>
              <Input
                value={formData.organization_type || ""}
                onChange={(e) => handleChange("organization_type", e.target.value)}
              />
            </div>

            <div>
              <Label>Address</Label>
              <Input
                value={formData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>

            <div>
              <Label>City</Label>
              <Input
                value={formData.city || ""}
                onChange={(e) => handleChange("city", e.target.value)}
              />
            </div>

            <div>
              <Label>State</Label>
              <Input
                value={formData.state || ""}
                onChange={(e) => handleChange("state", e.target.value)}
              />
            </div>

            <div>
              <Label>ZIP Code</Label>
              <Input
                value={formData.zip_code || ""}
                onChange={(e) => handleChange("zip_code", e.target.value)}
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
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>

            <div>
              <Label>Website</Label>
              <Input
                value={formData.website || ""}
                onChange={(e) => handleChange("website", e.target.value)}
              />
            </div>

            <div>
              <Label>Annual Revenue</Label>
              <Input
                value={formData.annual_revenue || ""}
                onChange={(e) => handleChange("annual_revenue", e.target.value)}
              />
            </div>

            <div>
              <Label>NTEE Code</Label>
              <Input
                value={formData.ntee_code || ""}
                onChange={(e) => handleChange("ntee_code", e.target.value)}
              />
            </div>

            <div>
              <Label>Ruling Date</Label>
              <Input
                value={formData.ruling_date || ""}
                onChange={(e) => handleChange("ruling_date", e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label>Mission</Label>
              <Textarea
                value={formData.mission || ""}
                onChange={(e) => handleChange("mission", e.target.value)}
                rows={4}
              />
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
      </DialogContent>
    </Dialog>
  );
}