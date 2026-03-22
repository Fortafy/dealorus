import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar } from "lucide-react";
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
      daysRemaining
    };
  }, [organization]);

  if (!subscriptionInfo) return null;

  const statusColors = {
    trial: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    canceled: "bg-red-100 text-red-800"
  };

  const planFeatures = {
    basic: ["Up to 10 users", "Basic reporting", "Email support"],
    premium: ["Up to 50 users", "Advanced reporting", "Priority support"],
    enterprise: ["Unlimited users", "Custom features", "Dedicated support"]
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="settings-page">
      
      <div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6">
          
          {/* Current Subscription */}
          <motion.div variants={itemVariants}>
            <Card className="settings-card">
              <CardContent className="settings-card-body pt-6">
                <div className="settings-section-header">
                  <div className="settings-row-responsive">
                    <div className="settings-text-block">
                      <h3 className="settings-card-title">Current Subscription</h3>
                      <p className="settings-card-description">Review your current plan, limits, and included features.</p>
                    </div>
                    <Badge className={statusColors[subscriptionInfo.status]}>
                      {subscriptionInfo.status.charAt(0).toUpperCase() + subscriptionInfo.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div className="settings-grid-two">
                  <div>
                    <p className="text-sm font-semibold settings-value-label">Plan</p>
                    <p className="text-sm capitalize settings-value">
                      {subscriptionInfo.plan}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold settings-value-label">Max Users</p>
                    <p className="text-sm settings-value">
                      {subscriptionInfo.maxUsers} users
                    </p>
                  </div>
                </div>

                {subscriptionInfo.status === "trial" && subscriptionInfo.daysRemaining !== null &&
                <div className="settings-card-divider">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-700">
                        Trial ends in <strong>{Math.max(0, subscriptionInfo.daysRemaining)} days</strong>
                      </span>
                    </div>
                    {subscriptionInfo.trialEndsAt &&
                  <p className="mt-2 text-xs text-slate-500">
                        {format(new Date(subscriptionInfo.trialEndsAt), "MMMM d, yyyy")}
                      </p>
                  }
                  </div>
                }

                <div className="settings-card-divider">
                  <div className="settings-section-header">
                    <h4 className="settings-section-title">Plan Features</h4>
                    <p className="settings-card-description">Included with your current subscription plan.</p>
                  </div>
                  <ul className="space-y-3">
                    {planFeatures[subscriptionInfo.plan]?.map((feature, index) =>
                    <li key={index} className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                        <span className="text-sm settings-value">{feature}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Billing Information */}
          <motion.div variants={itemVariants}>
            <Card className="settings-card">
              <CardContent className="settings-card-body pt-6">
                <div className="settings-section-header">
                  <div className="settings-text-block">
                    <h3 className="settings-card-title flex items-center gap-2">
                      
                      Billing Information
                    </h3>
                    <p className="settings-card-description">Review your billing contact and customer reference details.</p>
                  </div>
                </div>

                <div className="settings-grid-two">
                  <div>
                    <p className="text-sm font-semibold settings-value-label">Billing Email</p>
                    <p className="text-sm settings-value">{organization.billing_email || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold settings-value-label">Stripe Customer ID</p>
                    <p className="text-sm font-mono settings-value">{organization.stripe_customer_id || "Not configured"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upgrade CTA */}
          {subscriptionInfo.status === "trial" &&
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            
              <p className="text-sm text-slate-700 mb-3">
                Your trial subscription is active. Upgrade to a paid plan to continue using the app after your trial ends.
              </p>
            </motion.div>
          }

          {/* API Usage */}
          <motion.div variants={itemVariants}>
            <ApiUsageDashboard organization={organization} currentUser={currentUser} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>);

}