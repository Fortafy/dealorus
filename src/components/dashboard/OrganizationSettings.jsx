import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import LifecycleStageSettings from "./LifecycleStageSettings";
import LabelSettingsCard from "./LabelSettingsCard";

export default function OrganizationSettings({ organization }) {
  const { user } = useAuth();
  const showBrandingCard = user?.role === "admin";
  const canManageLabels = user?.role === "admin" || user?.client_role === "admin" || user?.data?.client_role === "admin";

  const [formData, setFormData] = useState({
    name: "",
    website: "",
    industry: "",
    default_notifications_enabled: true,
    billing_email: ""
  });

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
          <p className="text-slate-600">Loading organization...</p>
        </div>
      </div>);

  }
  const [brandingData, setBrandingData] = useState({
    logo_url: "",
    primary_color: "#3b82f6"
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
        billing_email: organization.billing_email || ""
      });
      setBrandingData({
        logo_url: organization.logo_url || "",
        primary_color: organization.primary_color || "#3b82f6"
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
    }
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
    }
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBrandingChange = (field, value) => {
    setBrandingData((prev) => ({
      ...prev,
      [field]: value
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
      className="settings-page">
      
      <div className="settings-stack">
        {error &&
        <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        }

        {success &&
        <Alert className="settings-feedback-success" variant="default">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="settings-feedback-success-text">{success}</AlertDescription>
          </Alert>
        }

        <Card className="settings-card">
          <CardContent className="settings-card-body pt-6">
            <div className="settings-section-header">
              <h3 className="settings-card-title">Basic Information</h3>
              <p className="settings-card-description">Update your organization profile and defaults.</p>
            </div>

            <div className="settings-grid-two">
            {/* Organization Name */}
            <div>
              <label className="settings-label">
                Organization Name
              </label>
              <Input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Your organization name"
                  className="settings-input" />
                
            </div>

            {/* Website */}
            <div>
              <label className="settings-label">
                Website
              </label>
              <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://example.com"
                  className="settings-input" />
                
            </div>

            {/* Industry */}
            <div>
              <label className="settings-label">
                Industry / Sector
              </label>
              <Input
                  value={formData.industry}
                  onChange={(e) => handleChange("industry", e.target.value)}
                  placeholder="e.g., Technology, Healthcare, Non-Profit"
                  className="settings-input" />
                
            </div>

            {/* Billing Email */}
            <div>
              <label className="settings-label flex items-center gap-2">
                <span>Billing Email</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 transition-colors hover:text-slate-600" aria-label="Billing email info">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Billing and invoice emails will be sent to this address</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Input
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => handleChange("billing_email", e.target.value)}
                  placeholder="billing@example.com"
                  className="settings-input" />
                
            </div>

            </div>

            <div className="my-3 settings-card-divider">
              <div className="settings-row-responsive">
                <div className="settings-text-block">
                  <label className="settings-section-title">
                    Enable Notifications for New Members
                  </label>
                  <p className="settings-helper">
                    New members will have notifications enabled by default.
                  </p>
                </div>
                <Switch
                  checked={formData.default_notifications_enabled}
                  onCheckedChange={(checked) =>
                  handleChange("default_notifications_enabled", checked)
                  } />
                
              </div>
            </div>

            <div className="settings-actions">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="settings-primary-button">
                
                {updateMutation.isPending ?
                <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </> :

                "Save Changes"
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {canManageLabels ? <LabelSettingsCard clientId={organization.id} /> : null}

        {showBrandingCard &&
        <Card className="settings-card">
          <CardContent className="settings-card-body pt-6">
            <div className="settings-section-header">
              <div className="flex items-center gap-2">
                <h3 className="settings-card-title">Branding & Logo</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                  Platform Admin Only
                </span>
              </div>
              <p className="settings-card-description">Manage your logo and brand color.</p>
              <p className="settings-helper">This is a Platform Admin only feature.</p>
            </div>

            <div className="settings-grid-two">
            {/* Logo URL */}
            <div>
              <label className="settings-label">
                Logo URL
              </label>
              <Input
                  type="url"
                  value={brandingData.logo_url}
                  onChange={(e) => handleLogoUrlChange(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="settings-input" />
                
              <p className="settings-helper">
                Enter the full URL to your organization logo
              </p>
            </div>

            {/* Primary Color */}
            <div>
              <label className="settings-label">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                      type="text"
                      value={brandingData.primary_color}
                      onChange={(e) => handleBrandingChange("primary_color", e.target.value)}
                      placeholder="#3b82f6"
                      className="settings-input settings-input-mono" />
                    
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
                    title="Click to open color picker" />
                  
              </div>
              <p className="settings-helper">
                Use hex format (e.g., #3b82f6)
              </p>
            </div>

            </div>

            {logoPreview &&
            <div className="settings-card-divider">
                <p className="settings-section-title mb-3">Logo Preview</p>
                <img
                src={logoPreview}
                alt="Logo preview"
                className="h-16 object-contain"
                onError={() => {
                  setError("Failed to load logo preview. Please check the URL.");
                  setLogoPreview(null);
                }} />
              
              </div>
            }

            <div className="settings-actions">
              <Button
                onClick={handleBrandingSave}
                disabled={updateBrandingMutation.isPending}
                className="settings-primary-button">
                
                {updateBrandingMutation.isPending ?
                <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </> :

                "Save Branding"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
        }

        <LifecycleStageSettings organization={organization} />

      </div>
    </motion.div>);

}