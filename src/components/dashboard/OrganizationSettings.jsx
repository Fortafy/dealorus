import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Loader, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import SalesforceIntegration from "./SalesforceIntegration";

export default function OrganizationSettings({ organization }) {
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    industry: "",
    default_notifications_enabled: true,
    billing_email: "",
  });

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
          <p className="text-slate-600">Loading organization...</p>
        </div>
      </div>
    );
  }
  const [brandingData, setBrandingData] = useState({
    logo_url: "",
    primary_color: "#3b82f6",
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        website: organization.website || "",
        industry: organization.industry || "",
        default_notifications_enabled: organization.default_notifications_enabled !== false,
        billing_email: organization.billing_email || "",
      });
      setBrandingData({
        logo_url: organization.logo_url || "",
        primary_color: organization.primary_color || "#3b82f6",
      });
      setLogoPreview(organization.logo_url);
    }
  }, [organization]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Client.update(organization.id, formData);
    },
    onSuccess: () => {
      setSuccess("Organization settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err.message || "Failed to update settings");
      setTimeout(() => setError(null), 3000);
    },
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Client.update(organization.id, brandingData);
    },
    onSuccess: () => {
      setSuccess("Branding settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err.message || "Failed to update branding");
      setTimeout(() => setError(null), 3000);
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBrandingChange = (field, value) => {
    setBrandingData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoUrlChange = (url) => {
    handleBrandingChange("logo_url", url);
    if (url) {
      setLogoPreview(url);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setError("Organization name is required");
      return;
    }
    updateMutation.mutate();
  };

  const handleBrandingSave = () => {
    updateBrandingMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 py-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Organization Settings</h2>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Organization Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Your organization name"
                className="text-base"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Website
              </label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://example.com"
                className="text-base"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Industry / Sector
              </label>
              <Input
                value={formData.industry}
                onChange={(e) => handleChange("industry", e.target.value)}
                placeholder="e.g., Technology, Healthcare, Non-Profit"
                className="text-base"
              />
            </div>

            {/* Billing Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Billing Email
              </label>
              <Input
                type="email"
                value={formData.billing_email}
                onChange={(e) => handleChange("billing_email", e.target.value)}
                placeholder="billing@example.com"
                className="text-base"
              />
              <p className="text-xs text-slate-500 mt-1">
                Billing and invoice emails will be sent to this address
              </p>
            </div>

            {/* Default Notifications */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Enable Notifications for New Members
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    New members will have notifications enabled by default
                  </p>
                </div>
                <Switch
                  checked={formData.default_notifications_enabled}
                  onCheckedChange={(checked) =>
                    handleChange("default_notifications_enabled", checked)
                  }
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                style={{ backgroundColor: 'hsl(39, 100%, 50%)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'hsl(39, 100%, 45%)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'hsl(39, 100%, 50%)'}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Branding Settings */}
        <Card className="border-0 shadow-lg mt-6">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle>Branding & Logo</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Logo URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo URL
              </label>
              <Input
                type="url"
                value={brandingData.logo_url}
                onChange={(e) => handleLogoUrlChange(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="text-base"
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter the full URL to your organization logo
              </p>
            </div>

            {/* Logo Preview */}
            {logoPreview && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-3">Logo Preview</p>
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-16 object-contain"
                  onError={() => {
                    setError("Failed to load logo preview. Please check the URL.");
                    setLogoPreview(null);
                  }}
                />
              </div>
            )}

            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={brandingData.primary_color}
                    onChange={(e) => handleBrandingChange("primary_color", e.target.value)}
                    placeholder="#3b82f6"
                    className="text-base font-mono"
                  />
                </div>
                <div
                  className="w-12 h-12 rounded-lg border-2 border-slate-200 cursor-pointer"
                  style={{ backgroundColor: brandingData.primary_color }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "color";
                    input.value = brandingData.primary_color;
                    input.onchange = (e) => handleBrandingChange("primary_color", e.target.value);
                    input.click();
                  }}
                  title="Click to open color picker"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Use hex format (e.g., #3b82f6)
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button
                onClick={handleBrandingSave}
                disabled={updateBrandingMutation.isPending}
                style={{ backgroundColor: 'hsl(39, 100%, 50%)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'hsl(39, 100%, 45%)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'hsl(39, 100%, 50%)'}
              >
                {updateBrandingMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Branding"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Salesforce Integration */}
        <div className="mt-6">
          <SalesforceIntegration organization={organization} />
        </div>
      </div>
    </motion.div>
  );
}