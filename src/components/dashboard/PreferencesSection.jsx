import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  Loader,
  Mail,
  Palette,
  Settings,
  User,
} from "lucide-react";
import { motion } from "framer-motion";

export default function PreferencesSection({ user }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [themePreference, setThemePreference] = useState("system");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState("weekly");
  const [feedback, setFeedback] = useState(null);

  const { data: client } = useQuery({
    queryKey: ["user-client", user?.client_id],
    enabled: !!user?.client_id,
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: user.client_id });
      return clients[0];
    },
  });

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || "");
    setEmail(user.email || "");
    setThemePreference(user.theme_preference || "system");
    setNotificationsEnabled(user.notifications_enabled !== false);
    setEmailDigest(user.email_digest || "weekly");
  }, [user]);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3000);
  };

  const profileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => showFeedback("success", "Preferences updated successfully"),
    onError: (err) => showFeedback("error", err.message || "Failed to update preferences"),
  });

  const settingsMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => showFeedback("success", "Preferences updated successfully"),
    onError: (err) => showFeedback("error", err.message || "Failed to update preferences"),
  });

  const handleProfileSave = () => {
    if (!fullName.trim()) {
      showFeedback("error", "Full name is required");
      return;
    }

    profileMutation.mutate({ full_name: fullName });
  };

  const handleThemeChange = (value) => {
    setThemePreference(value);
    settingsMutation.mutate({ theme_preference: value });
  };

  const handleNotificationsToggle = (checked) => {
    setNotificationsEnabled(checked);
    settingsMutation.mutate({ notifications_enabled: checked });
  };

  const handleEmailDigestChange = (value) => {
    setEmailDigest(value);
    settingsMutation.mutate({ email_digest: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 py-6"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Preferences</h2>
          <p className="mt-1 text-sm text-slate-500">Manage your profile and personal app settings in one place.</p>
        </div>

        {feedback && (
          <Alert className={feedback.type === "error" ? "" : "bg-green-50 border-green-200"} variant={feedback.type === "error" ? "destructive" : "default"}>
            {feedback.type === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={feedback.type === "error" ? "" : "text-green-800"}>
              {feedback.text}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="text-base"
              />
              <p className="text-xs text-slate-500 mt-1">This is the name displayed throughout the app.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <Input value={email} disabled className="text-base bg-slate-50 cursor-not-allowed" />
              <p className="text-xs text-slate-500 mt-1">Email address cannot be changed directly.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">User ID</label>
              <Input value={user?.id || ""} disabled className="text-base bg-slate-50 cursor-not-allowed font-mono" />
              <p className="text-xs text-slate-500 mt-1">Your unique user identifier.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organization
              </label>
              <Input
                value={client?.name || (user?.client_id ? "Loading..." : "Not assigned")}
                disabled
                className="text-base bg-slate-50 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">Managed by your organization administrator.</p>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button onClick={handleProfileSave} disabled={profileMutation.isPending}>
                {profileMutation.isPending ? (
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

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">Theme Preference</label>
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
            <p className="text-xs text-slate-500 mt-2">Choose how you prefer the app to look.</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">Enable Notifications</p>
                <p className="text-sm text-slate-500 mt-1">Receive updates about your activities and organization.</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationsToggle} />
            </div>

            {notificationsEnabled && (
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-3">Email Digest Frequency</label>
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
                <p className="text-xs text-slate-500 mt-2">How often you want to receive email summaries.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}