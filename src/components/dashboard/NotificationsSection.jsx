import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function NotificationsSection({ user }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState("weekly");
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!user) return;
    setNotificationsEnabled(user.notifications_enabled !== false);
    setEmailDigest(user.email_digest || "weekly");
  }, [user]);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3000);
  };

  const settingsMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => showFeedback("success", "Preferences updated successfully"),
    onError: (err) => showFeedback("error", err.message || "Failed to update preferences")
  });

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
          <CardContent className="settings-card-body-stack">
            <div className="settings-row-between">
              <div className="settings-text-block">
                <h3 className="settings-card-title">Notifications</h3>
                <p className="settings-card-description">Choose whether you want to receive updates and summaries.</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationsToggle} />
            </div>

            {notificationsEnabled &&
            <div className="settings-card-divider">
                <div className="settings-row-responsive">
                  <div>
                    <p className="settings-label-compact">Email Digest Frequency</p>
                    <p className="settings-card-description">How often you want to receive email summaries.</p>
                  </div>
                  <div className="settings-select-width">
                    <Select value={emailDigest} onValueChange={handleEmailDigestChange}>
                      <SelectTrigger className="settings-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="settings-select-content">
                        <SelectItem value="daily" className="settings-select-item">Daily</SelectItem>
                        <SelectItem value="weekly" className="settings-select-item">Weekly</SelectItem>
                        <SelectItem value="never" className="settings-select-item">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            }
          </CardContent>
        </Card>
      </div>
    </motion.div>);

}