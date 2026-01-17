import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Edit, Sparkles, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ACTION_CONFIG = {
  create: {
    icon: CheckCircle,
    label: "Contact Created",
    color: "text-green-600",
    bgColor: "bg-green-50"
  },
  edit: {
    icon: Edit,
    label: "Contact Edited",
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  enrich: {
    icon: Sparkles,
    label: "Contact Enriched",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50"
  },
  star: {
    icon: Star,
    label: "Contact Starred",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50"
  }
};

export default function ActivityFeed({ contactId }) {
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ["activities", contactId],
    queryFn: async () => {
      const allActivities = await base44.entities.Activity.filter({ contact_id: contactId });
      return allActivities.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">Loading activity history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load activity history</AlertDescription>
      </Alert>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500 text-sm">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {activities.map((activity) => {
        const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.edit;
        const Icon = config.icon;

        return (
          <div key={activity.id} className={`p-3 rounded-lg border border-slate-200 ${config.bgColor}`}>
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                  </p>
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  {format(new Date(activity.created_date), "MMM d, yyyy 'at' h:mm a")}
                </p>
                <p className="text-sm text-slate-700">{activity.description}</p>

                {activity.fields_changed && activity.fields_changed.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs">
                    {activity.fields_changed.map((change, idx) => (
                      <div key={idx} className="text-slate-600">
                        <span className="font-medium">{change.field}:</span>
                        {change.old_value && (
                          <span className="line-through text-slate-500 mx-1">{change.old_value}</span>
                        )}
                        {change.new_value && (
                          <span className={`font-medium ${config.color}`}>{change.new_value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}