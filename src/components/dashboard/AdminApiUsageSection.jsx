import React from "react";
import ApiUsageDashboard from "@/components/dashboard/ApiUsageDashboard";

export default function AdminApiUsageSection({ organization, currentUser }) {
  return (
    <div className="settings-page">
      <ApiUsageDashboard
        organization={organization}
        currentUser={currentUser}
        scope="platform"
        showClientBreakdown={true}
      />
    </div>
  );
}