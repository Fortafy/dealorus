import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  formatActivityActorName,
  formatActivityTimelineDate,
  getActivityActorInitials,
  getActivityTimelineAccentClass,
} from "@/lib/activityTimelineTheme";

const formatFieldName = (field) =>
  field
    ?.split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Field";

const formatChangeValue = (value) => {
  if (value === null || value === undefined || value === "") return "Cleared";
  return String(value);
};

export default function ActivityRecordModifiedCard({ item }) {
  const actorName = formatActivityActorName(item.created_by);

  return (
    <div className="activity-timeline-card">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Avatar className="h-6 w-6 border border-slate-200 bg-slate-100">
                    <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-700">
                      {getActivityActorInitials(actorName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>{actorName}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="shrink-0 text-xs text-slate-400">{formatActivityTimelineDate(item.timestamp)}</span>
        </div>

        <div className="w-full space-y-1.5 text-xs">
          {(item.fields_changed || []).map((change, idx) => (
            <div key={idx} className="text-xs text-slate-600">
              <span className="text-slate-500">{formatFieldName(change.field)}:</span>
              <span className="mx-1 text-slate-400 line-through">
                {formatChangeValue(change.old_value)}
              </span>
              <span className="mx-1 text-slate-400">→</span>
              <span className={`font-semibold ${getActivityTimelineAccentClass(item.itemType)}`}>
                {formatChangeValue(change.new_value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}