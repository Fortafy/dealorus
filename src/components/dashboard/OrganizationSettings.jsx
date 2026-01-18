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

export default function OrganizationSettings({ organization }) {
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    industry: "",
    default_notifications_enabled: true,
    billing_email: "",
  });
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
    }
  }, [organization]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Organization.update(organization.id, formData);
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

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setError("Organization name is required");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      <div className="max-w-2xl">
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
                className="bg-blue-600 hover:bg-blue-700"
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
      </div>
    </motion.div>
  );
}