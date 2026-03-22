import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import moment from "moment";

export default function ActivityTimeline({ organization, isCollapsed }) {
  const [isOpen, setIsOpen] = useState(true);

  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions", organization.id],
    queryFn: () => base44.entities.Interaction.filter({ organization_id: organization.id }, "-created_date"),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", organization.id],
    queryFn: () => base44.entities.Note.filter({ organization_id: organization.id }, "-created_date"),
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", organization.id],
    queryFn: () => base44.entities.Deal.filter({ organization_id: organization.id }, "-created_date"),
  });

  const getIconConfig = (item) => {
    if (item.type === "note") return { label: "NOTE", bg: "bg-amber-100", text: "text-amber-700" };
    if (item.type === "deal") return { label: "DEAL", bg: "bg-emerald-100", text: "text-emerald-700" };
    if (item.interactionType === "email") return { label: "EMAIL", bg: "bg-blue-100", text: "text-blue-700" };
    if (item.interactionType === "call") return { label: "CALL", bg: "bg-purple-100", text: "text-purple-700" };
    return { label: "MTG", bg: "bg-rose-100", text: "text-rose-700" };
  };

  const mergedActivity = [
    ...interactions.map((i) => ({
      ...i,
      type: "interaction",
      interactionType: i.type,
      timestamp: i.created_date,
    })),
    ...notes.map((n) => ({
      ...n,
      type: "note",
      timestamp: n.created_date,
    })),
    ...deals.map((d) => ({
      ...d,
      type: "deal",
      timestamp: d.created_date,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div>
      {/* Header row */}
      <button
        className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-50 border-b border-slate-200 hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen(o => !o)}
      >
        <span className="text-sm font-semibold text-slate-700">Activity Timeline ({mergedActivity.length})</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div>
          {mergedActivity.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No activity yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {mergedActivity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="text-lg flex-shrink-0 mt-0.5">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{item.type === "interaction" ? item.subject : item.type === "note" ? item.title : item.name}</p>
                      <span className="text-xs text-slate-500 flex-shrink-0">{moment(item.timestamp).fromNow()}</span>
                    </div>
                    {item.type === "interaction" && (
                      <Badge className="mt-1 text-xs" variant="outline">
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Badge>
                    )}
                    {item.type === "deal" && item.value && (
                      <Badge className="mt-1 text-xs">${item.value.toLocaleString()}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}