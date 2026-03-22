import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import ApiUsageDashboard from "@/components/dashboard/ApiUsageDashboard";

export default function SubscriptionDetails({ organization, currentUser }) {
  const subscriptionInfo = useMemo(() => {
    if (!organization) return null;

    const status = organization.subscription_status || "trial";
    const plan = organization.subscription_plan || "basic";
    const maxUsers = organization.max_users || 1;
    const trialEndsAt = organization.trial_ends_at;
    
    const daysRemaining = trialEndsAt ? differenceInDays(new Date(trialEndsAt), new Date()) : null;

    return {
      status,
      plan,
      maxUsers,
      trialEndsAt,
      daysRemaining,
    };
  }, [organization]);

  if (!subscriptionInfo) return null;

  const statusColors = {
    trial: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    canceled: "bg-red-100 text-red-800",
  };

  const planFeatures = {
    basic: ["Up to 10 users", "Basic reporting", "Email support"],
    premium: ["Up to 50 users", "Advanced reporting", "Priority support"],
    enterprise: ["Unlimited users", "Custom features", "Dedicated support"],
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="settings-page"
    >
      <div>
        <h2 className="settings-page-title">Subscription & Billing</h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Subscription Status */}
          <motion.div variants={itemVariants}>
            <Card className="settings-card">
              <CardHeader className="settings-card-header">
                <CardTitle className="settings-card-title flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Current Subscription
                  </span>
                  <Badge className={statusColors[subscriptionInfo.status]}>
                    {subscriptionInfo.status.charAt(0).toUpperCase() + subscriptionInfo.status.slice(1)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="settings-card-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="settings-value-label">Plan</p>
                    <p className="settings-value capitalize">
                      {subscriptionInfo.plan}
                    </p>
                  </div>
                  <div>
                    <p className="settings-value-label">Max Users</p>
                    <p className="settings-value">
                      {subscriptionInfo.maxUsers} users
                    </p>
                  </div>
                </div>

                {subscriptionInfo.status === "trial" && subscriptionInfo.daysRemaining !== null && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-700">
                        Trial ends in <strong>{Math.max(0, subscriptionInfo.daysRemaining)} days</strong>
                      </span>
                    </div>
                    {subscriptionInfo.trialEndsAt && (
                      <p className="text-xs text-slate-500 mt-2">
                        {format(new Date(subscriptionInfo.trialEndsAt), "MMMM d, yyyy")}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Plan Features */}
          <motion.div variants={itemVariants}>
            <Card className="settings-card">
              <CardHeader className="settings-card-header">
                <CardTitle className="settings-card-title flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Plan Features
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {planFeatures[subscriptionInfo.plan]?.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Billing Information */}
          <motion.div variants={itemVariants}>
            <Card className="settings-card">
              <CardHeader className="settings-card-header">
                <CardTitle className="settings-card-title flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Billing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="settings-card-body space-y-4">
                <div>
                  <p className="settings-value-label">Billing Email</p>
                  <p className="settings-value">{organization.billing_email || "Not set"}</p>
                </div>
                <div>
                  <p className="settings-value-label">Stripe Customer ID</p>
                  <p className="font-mono text-xs text-slate-600">
                    {organization.stripe_customer_id || "Not configured"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upgrade CTA */}
          {subscriptionInfo.status === "trial" && (
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4"
            >
              <p className="text-sm text-slate-700 mb-3">
                Your trial subscription is active. Upgrade to a paid plan to continue using the app after your trial ends.
              </p>
            </motion.div>
          )}

          {/* API Usage */}
          <motion.div variants={itemVariants}>
            <ApiUsageDashboard organization={organization} currentUser={currentUser} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}