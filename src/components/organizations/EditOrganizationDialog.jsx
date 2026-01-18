import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function EditOrganizationDialog({ organization, open, onOpenChange, onSave }) {
  const [formData, setFormData] = useState(organization);
  const [nteeValidation, setNteeValidation] = useState({ status: null, description: null });
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setFormData(organization);
    setNteeValidation({ status: null, description: null });
  }, [organization, open]);

  const validateNTEECode = async (code) => {
    if (!code || code.trim() === "") {
      setNteeValidation({ status: null, description: null });
      return;
    }

    setIsValidating(true);
    try {
      const response = await base44.functions.invoke('validateNTEECode', { code });
      
      if (response.data.valid) {
        setNteeValidation({ 
          status: 'valid', 
          description: response.data.description 
        });
        setFormData(prev => ({ ...prev, ntee_description: response.data.description }));
      } else {
        setNteeValidation({ status: 'invalid', description: null });
      }
    } catch (error) {
      console.error('NTEE validation error:', error);
      setNteeValidation({ status: 'error', description: null });
    } finally {
      setIsValidating(false);
    }
  };

  const handleNTEEChange = (value) => {
    setFormData({ ...formData, ntee_code: value });
    const debounceTimer = setTimeout(() => {
      validateNTEECode(value);
    }, 500);
    return () => clearTimeout(debounceTimer);
  };

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
              <div className="relative">
                <Input
                  value={formData.ntee_code || ""}
                  onChange={(e) => handleNTEEChange(e.target.value)}
                  className={nteeValidation.status === 'invalid' ? 'border-red-500' : nteeValidation.status === 'valid' ? 'border-green-500' : ''}
                />
                {isValidating && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                )}
                {!isValidating && nteeValidation.status === 'valid' && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
                {!isValidating && nteeValidation.status === 'invalid' && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                )}
              </div>
              {nteeValidation.status === 'valid' && nteeValidation.description && (
                <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700 border-green-200">
                  {nteeValidation.description}
                </Badge>
              )}
              {nteeValidation.status === 'invalid' && (
                <p className="text-xs text-red-500 mt-1">Invalid NTEE code</p>
              )}
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