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
  SelectValue } from
"@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Loader } from
"lucide-react";
import { motion } from "framer-motion";

export default function PreferencesSection({ user }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [themePreference, setThemePreference] = useState("system");
  const [feedback, setFeedback] = useState(null);

  const resolvedClientId = user?.client_id || user?.active_client_id || user?.data?.client_id || user?.data?.active_client_id;

  const { data: client } = useQuery({
    queryKey: ["user-client", resolvedClientId],
    enabled: !!resolvedClientId,
    queryFn: async () => {
      return await base44.entities.Client.get(resolvedClientId);
    }
  });

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || "");
    setEmail(user.email || "");
    setThemePreference(user.theme_preference || "system");
  }, [user]);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3000);
  };

  const profileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => showFeedback("success", "Preferences updated successfully"),
    onError: (err) => showFeedback("error", err.message || "Failed to update preferences")
  });

  const settingsMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => showFeedback("success", "Preferences updated successfully"),
    onError: (err) => showFeedback("error", err.message || "Failed to update preferences")
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="settings-page">
      
      <div className="settings-stack">

        {feedback &&
        <Alert className={feedback.type === "error" ? "" : "settings-feedback-success"} variant={feedback.type === "error" ? "destructive" : "default"}>
            {feedback.type === "error" ?
          <AlertCircle className="h-4 w-4" /> :

          <CheckCircle2 className="h-4 w-4 text-green-600" />
          }
            <AlertDescription className={feedback.type === "error" ? "" : "settings-feedback-success-text"}>
              {feedback.text}
            </AlertDescription>
          </Alert>
        }

        <Card className="settings-card">
          <CardContent className="settings-card-body pt-6">
            <div className="settings-section-header">
              <h3 className="settings-card-title">Personal Information</h3>
              <p className="settings-card-description">Update your name and review your account details.</p>
            </div>

            <div className="settings-grid-two">
              <div>
                <label className="settings-label">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="settings-input" />
                
              </div>

              <div>
                <label className="settings-label">Email Address</label>
                <Input value={email} disabled className="settings-input-disabled" />
              </div>

              <div>
                <label className="settings-label">User ID</label>
                <Input value={user?.id || ""} disabled className="settings-input-disabled settings-input-mono" />
              </div>

              <div>
                <label className="settings-label">Organization</label>
                <Input
                  value={client?.name || (user?.client_id ? "Loading..." : "Not assigned")}
                  disabled
                  className="settings-input-disabled" />
                
              </div>
            </div>

            <div className="settings-actions">
              <Button onClick={handleProfileSave} disabled={profileMutation.isPending} className="settings-primary-button">
                {profileMutation.isPending ?
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

        <Card className="settings-card">
          <CardContent className="settings-card-body">
            <div className="settings-row-responsive">
              <div className="settings-text-block">
                <h3 className="settings-card-title">Theme</h3>
                <p className="settings-card-description">Select or customize your interface color scheme.</p>
              </div>
              <div className="settings-select-width">
                <Select value={themePreference} onValueChange={handleThemeChange}>
                  <SelectTrigger className="settings-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="settings-select-content">
                    <SelectItem value="light" className="settings-select-item">Light</SelectItem>
                    <SelectItem value="dark" className="settings-select-item">Dark</SelectItem>
                    <SelectItem value="system" className="settings-select-item">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>);

}