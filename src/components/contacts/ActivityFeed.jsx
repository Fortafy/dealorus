import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, isValid } from "date-fns";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getActivityTimelineAccentClass,
  getActivityTimelineAppearance,
  getActivityTimelineNodeClass,
} from "@/lib/activityTimelineTheme";

const formatFieldName = (field) => field
  .split("_")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const stripHtml = (value) => value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
const toSafeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && isValid(date) ? date : null;
};
const formatTimestamp = (value) => {
  const date = toSafeDate(value);
  return date ? format(date, "MMM d, yyyy 'at' h:mm a") : "Date unavailable";
};

export default function ActivityFeed({ contactId, contact }) {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["activities", contactId, contact?.created_date],
    queryFn: async () => {
      const [activities, notes] = await Promise.all([
        base44.entities.Activity.filter({ contact_id: contactId }),
        base44.entities.Note.filter({ contact_id: contactId }),
      ]);

      const hasCreateActivity = activities.some((activity) => activity.action === "create");
      const createdItem = contact?.created_date && !hasCreateActivity
        ? [{ id: `contact-created-${contactId}`, itemType: "create", timestamp: contact.created_date }]
        : [];

      return [
        ...createdItem,
        ...activities.map((activity) => ({
          ...activity,
          itemType: activity.action || "edit",
          timestamp: activity.created_date || activity.updated_date || null,
        })),
        ...notes.map((note) => ({
          ...note,
          itemType: "note",
          timestamp: note.created_date || note.updated_date || null,
        })),
      ].sort((a, b) => {
        const first = toSafeDate(a.timestamp)?.getTime() || 0;
        const second = toSafeDate(b.timestamp)?.getTime() || 0;
        return second - first;
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
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

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="activity-timeline-scroll">
      <div className="activity-timeline-track">
        <div className="activity-timeline-line" />

        <div className="activity-timeline-list">
          {items.map((item) => {
            const appearance = getActivityTimelineAppearance(item.itemType);
            const Icon = appearance.icon;

            return (
              <div key={`${item.itemType}-${item.id}`} className="activity-timeline-item">
                <div className={getActivityTimelineNodeClass(item.itemType)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="activity-timeline-card">
                  <div className="activity-timeline-card-header">
                    <p className="activity-timeline-card-title">{item.itemType === "note" ? item.title : appearance.label}</p>
                    <span className="activity-timeline-card-timestamp">{formatTimestamp(item.timestamp)}</span>
                  </div>

                  {item.itemType === "note" ? (
                    stripHtml(item.content) ? <div className="activity-timeline-detail-box">{stripHtml(item.content)}</div> : null
                  ) : (
                    item.fields_changed?.length ? (
                      <div className="activity-timeline-card-body">
                        {item.fields_changed.map((change, idx) => (
                          <div key={idx} className="activity-timeline-detail-box">
                            <span className="activity-timeline-detail-label">{formatFieldName(change.field)}:</span>
                            {change.old_value ? (
                              <span className="mx-1 line-through text-slate-400">{change.old_value}</span>
                            ) : (
                              <span className="mx-1 text-slate-400">empty</span>
                            )}
                            <span className={getActivityTimelineAccentClass(item.itemType)}>{change.new_value || "empty"}</span>
                          </div>
                        ))}
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}