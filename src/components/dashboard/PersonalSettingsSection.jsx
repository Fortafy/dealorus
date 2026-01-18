import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, AlertCircle, Loader, Settings, Bell, Palette } from "lucide-react";
import { motion } from "framer-motion";

export default function PersonalSettingsSection({ user }) {
  const [themePreference, setThemePreference] = useState("system");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState("weekly");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (user) {
      setThemePreference(user.theme_preference || "system");
      setNotificationsEnabled(user.notifications_enabled !== false);
      setEmailDigest(user.email_digest || "weekly");
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
      return data;
    },
    onSuccess: () => {
      setSuccess("Settings updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err.message || "Failed to update settings");
      setTimeout(() => setError(null), 3000);
    },
  });

  const handleThemeChange = (value) => {
    setThemePreference(value);
    updateMutation.mutate({ theme_preference: value });
  };

  const handleNotificationsToggle = (checked) => {
    setNotificationsEnabled(checked);
    updateMutation.mutate({ notifications_enabled: checked });
  };

  const handleEmailDigestChange = (value) => {
    setEmailDigest(value);
    updateMutation.mutate({ email_digest: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 py-6"
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Personal Settings</h2>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Appearance Settings */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Theme Preference
              </label>
              <Select value={themePreference} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                Choose how you prefer the app to look
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Enable/Disable Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Enable Notifications</p>
                <p className="text-sm text-slate-500 mt-1">
                  Receive updates about your activities and organization
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationsToggle}
              />
            </div>

            {/* Email Digest */}
            {notificationsEnabled && (
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Email Digest Frequency
                </label>
                <Select value={emailDigest} onValueChange={handleEmailDigestChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">
                  How often you want to receive email summaries
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}