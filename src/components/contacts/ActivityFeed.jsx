import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Edit, Sparkles, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ACTION_CONFIG = {
  create: {
    icon: CheckCircle,
    label: "Contact Created",
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
    accentColor: "text-green-700"
  },
  edit: {
    icon: Edit,
    label: "Contact Edited",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    accentColor: "text-blue-700"
  },
  enrich: {
    icon: Sparkles,
    label: "Contact Enriched",
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-100",
    accentColor: "text-indigo-700"
  },
  star: {
    icon: Star,
    label: "Contact Starred",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
    accentColor: "text-amber-700"
  }
};

const formatFieldName = (field) => field.
split("_").
map((part) => part.charAt(0).toUpperCase() + part.slice(1)).
join(" ");

export default function ActivityFeed({ contactId }) {
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ["activities", contactId],
    queryFn: async () => {
      const allActivities = await base44.entities.Activity.filter({ contact_id: contactId });
      return allActivities.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Loading activity history...</p>
        </div>
      </div>);

  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load activity history</AlertDescription>
      </Alert>);

  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500">No activity recorded yet</p>
      </div>);

  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="relative">
        <div className="absolute bottom-3 left-[13px] top-3 w-px bg-slate-200" />

        <div className="space-y-0 pr-1">
          {activities.map((activity) => {
            const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.edit;
            const Icon = config.icon;

            return (
              <div key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
                <div className={`relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
                  <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
                </div>

                <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-white px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">{config.label}</p>
                    <span className="flex-shrink-0 text-xs text-slate-400">
                      {format(new Date(activity.created_date), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  

                  {activity.fields_changed && activity.fields_changed.length > 0 &&
                  <div className="mt-2 space-y-1.5">
                      {activity.fields_changed.map((change, idx) =>
                    <div key={idx} className="rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                          <span className="font-medium text-slate-700">{formatFieldName(change.field)}:</span>
                          {change.old_value ?
                      <span className="mx-1 line-through text-slate-400">{change.old_value}</span> :

                      <span className="mx-1 text-slate-400">empty</span>
                      }
                          <span className={config.accentColor}>{change.new_value || "empty"}</span>
                        </div>
                    )}
                    </div>
                  }
                </div>
              </div>);

          })}
        </div>
      </div>
    </div>);

}