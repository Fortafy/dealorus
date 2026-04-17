import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function BrandingSettings({ organization }) {
  const [formData, setFormData] = useState({
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
      setSuccess("Branding settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err.message || "Failed to update branding");
      setTimeout(() => setError(null), 3000);
    },
  });

  const handleLogoUrlChange = (url) => {
    setFormData(prev => ({
      ...prev,
      logo_url: url,
    }));
    if (url) {
      setLogoPreview(url);
    }
  };

  const handleColorChange = (color) => {
    setFormData(prev => ({
      ...prev,
      primary_color: color,
    }));
  };

  const handleSave = () => {
    updateMutation.mutate();
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="settings-page--narrow"
    >
      <div>
        <h2 className="settings-page-title">Branding & Organization Logo</h2>

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

        <Card className="settings-card">
          <CardHeader className="settings-card-header">
            <CardTitle className="settings-card-title">Branding Settings</CardTitle>
          </CardHeader>
          <CardContent className="settings-card-body space-y-5">
            {/* Logo URL */}
            <div>
              <label className="settings-label">
                Logo URL
              </label>
              <Input
                type="url"
                value={formData.logo_url}
                onChange={(e) => handleLogoUrlChange(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="settings-input"
              />
              <p className="settings-helper">
                Enter the full URL to your organization logo
              </p>
            </div>

            {/* Logo Preview */}
            {logoPreview && (
              <div className="settings-info-panel">
                <p className="settings-section-title mb-3">Logo Preview</p>
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
              <label className="settings-label">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    placeholder="#3b82f6"
                    className="settings-input settings-input-mono"
                  />
                </div>
                <div
                  className="w-12 h-12 rounded-lg border-2 border-slate-200 cursor-pointer"
                  style={{ backgroundColor: formData.primary_color }}
                  onClick={() => {
                    // Trigger color input programmatically
                    const input = document.createElement("input");
                    input.type = "color";
                    input.value = formData.primary_color;
                    input.onchange = (e) => handleColorChange(e.target.value);
                    input.click();
                  }}
                  title="Click to open color picker"
                />
              </div>
              <p className="settings-helper">
                Use hex format (e.g., #3b82f6)
              </p>
            </div>

            {/* Save Button */}
            <div className="settings-actions">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="settings-primary-button"
              >
                {updateMutation.isPending ? (
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
      </div>
    </motion.div>
  );
}