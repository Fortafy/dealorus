import React from "react";
import ActivityFeed from "@/components/contacts/ActivityFeed";

export default function ContactActivityTimelineSection({ contactId, contact }) {
  return (
    <div className="border-t border-slate-100">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-700">Activity Timeline</span>
      </div>
      <div className="px-4 py-3">
        <ActivityFeed contactId={contactId} contact={contact} />
      </div>
    </div>
  );
}