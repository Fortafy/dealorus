import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  CheckCircle2,
  Loader,
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
      <div className="space-y-4">

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

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Personal Information</h3>
              <p className="mt-1 text-sm text-slate-500">Update your name and review your account details.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <Input value={email} disabled className="h-11 bg-slate-50 cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">User ID</label>
                <Input value={user?.id || ""} disabled className="h-11 bg-slate-50 cursor-not-allowed font-mono" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Organization</label>
                <Input
                  value={client?.name || (user?.client_id ? "Loading..." : "Not assigned")}
                  disabled
                  className="h-11 bg-slate-50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
              <Button onClick={handleProfileSave} disabled={profileMutation.isPending} className="h-10 px-4">
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

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h3 className="text-xl font-semibold text-slate-900">Theme</h3>
                <p className="mt-1 text-sm text-slate-500">Select or customize your interface color scheme.</p>
              </div>
              <div className="w-full md:w-72">
                <Select value={themePreference} onValueChange={handleThemeChange}>
                  <SelectTrigger className="h-11 w-full rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <h3 className="text-xl font-semibold text-slate-900">Notifications</h3>
                <p className="mt-1 text-sm text-slate-500">Choose whether you want to receive updates and summaries.</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationsToggle} />
            </div>

            {notificationsEnabled && (
              <div className="border-t border-slate-200 pt-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Email Digest Frequency</p>
                    <p className="mt-1 text-sm text-slate-500">How often you want to receive email summaries.</p>
                  </div>
                  <div className="w-full md:w-72">
                    <Select value={emailDigest} onValueChange={handleEmailDigestChange}>
                      <SelectTrigger className="h-11 w-full rounded-xl bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}