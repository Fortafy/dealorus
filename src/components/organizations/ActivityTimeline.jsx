import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, MessageSquare, Handshake } from "lucide-react";
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
    if (item.type === "deal") return { label: "DEAL", bg: "bg-emerald-100", text: "text-emerald-700" };
    if (item.interactionType === "email") return { label: "EMAIL", bg: "bg-blue-100", text: "text-blue-700" };
    if (item.interactionType === "call") return { label: "CALL", bg: "bg-purple-100", text: "text-purple-700" };
    return { label: "MTG", bg: "bg-rose-100", text: "text-rose-700" };
  };

  const getInitials = (email) => {
    if (!email) return "?";
    return email.split("@")[0].slice(0, 2).toUpperCase();
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
              {mergedActivity.map((item) => {
                if (item.type === "note") {
                  return (
                    <div key={`note-${item.id}`} className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      {/* Note favicon icon */}
                      <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Header row: avatar + author + time */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                              {getInitials(item.created_by)}
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{item.created_by?.split("@")[0] || "Unknown"}</span>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{moment(item.timestamp).fromNow()}</span>
                        </div>
                        {/* Note title */}
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        {/* Note content preview */}
                        {item.content && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: item.content.replace(/<[^>]*>/g, " ").trim() }}
                          />
                        )}
                      </div>
                    </div>
                  );
                }

                if (item.type === "deal") {
                  return (
                    <div key={`deal-${item.id}`} className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      {/* Deal favicon icon */}
                      <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Handshake className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Header row: avatar + author + time */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                              {getInitials(item.created_by)}
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{item.created_by?.split("@")[0] || "Unknown"}</span>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{moment(item.timestamp).fromNow()}</span>
                        </div>
                        {/* Deal name */}
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        {/* Deal details */}
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {item.stage && (
                            <span className="text-xs text-slate-500">{item.stage}</span>
                          )}
                          {item.value && (
                            <span className="text-xs font-medium text-emerald-700">${item.value.toLocaleString()}</span>
                          )}
                          {item.expected_close_date && (
                            <span className="text-xs text-slate-500">Close: {moment(item.expected_close_date).format("MMM D, YYYY")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                const ic = getIconConfig(item);
                return (
                  <div key={`${item.type}-${item.id}`} className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className={`flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide ${ic.bg} ${ic.text}`}>{ic.label}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{item.subject}</p>
                        <span className="text-xs text-slate-500 flex-shrink-0">{moment(item.timestamp).fromNow()}</span>
                      </div>
                      <Badge className="mt-1 text-xs" variant="outline">
                        {item.interactionType?.charAt(0).toUpperCase() + item.interactionType?.slice(1)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}