import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, BarChart3 } from "lucide-react";

export default function UsageLimitNotice({ usage, requiredCredits = 1, actionLabel = "This action" }) {
  if (!usage || usage.remaining >= requiredCredits) {
    return null;
  }

  const title = usage.isLimitReached
    ? "Monthly API limit reached"
    : "Not enough monthly API credits remaining";

  const buttonLabel = usage.plan === "free" ? "Upgrade to Paid" : "Review Plan";

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <BarChart3 className="h-4 w-4 text-amber-600" />
      <AlertDescription className="space-y-3 text-amber-900">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm">
            Your team has used {usage.used.toLocaleString()} of {usage.monthlyLimit.toLocaleString()} monthly credits.
            {requiredCredits > 1 ? ` ${actionLabel} needs ${requiredCredits} credits.` : ""}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-amber-600 text-white hover:bg-amber-700"
          onClick={() => {
            window.location.href = "/Settings";
          }}
        >
          {buttonLabel}
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}