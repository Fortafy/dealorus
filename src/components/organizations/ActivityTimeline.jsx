import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MessageSquare, Handshake, Phone, Mail, Users, SlidersHorizontal, X } from "lucide-react";
import moment from "moment";

const TYPE_OPTIONS = [
  { value: "note", label: "Notes" },
  { value: "deal", label: "Deals" },
  { value: "email", label: "Emails" },
  { value: "call", label: "Calls" },
  { value: "meeting", label: "Meetings" },
];

export default function ActivityTimeline({ organization, lifecycleStages = [] }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [showFromCal, setShowFromCal] = useState(false);
  const [showToCal, setShowToCal] = useState(false);

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

  const filteredActivity = mergedActivity.filter((item) => {
    // Type filter
    if (selectedTypes.length > 0) {
      const itemType = item.type === "interaction" ? item.interactionType : item.type;
      if (!selectedTypes.includes(itemType)) return false;
    }
    // Date range filter
    if (dateFrom && new Date(item.timestamp) < dateFrom) return false;
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (new Date(item.timestamp) > endOfDay) return false;
    }
    return true;
  });

  const hasActiveFilters = selectedTypes.length > 0 || dateFrom || dateTo;

  const clearFilters = () => {
    setSelectedTypes([]);
    setDateFrom(null);
    setDateTo(null);
  };

  const toggleType = (val) => {
    setSelectedTypes(prev =>
      prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]
    );
  };

  const getItemIcon = (item) => {
    if (item.type === "note") return <MessageSquare className="w-3.5 h-3.5 text-amber-600" />;
    if (item.type === "deal") return <Handshake className="w-3.5 h-3.5 text-emerald-600" />;
    if (item.interactionType === "call") return <Phone className="w-3.5 h-3.5 text-purple-600" />;
    if (item.interactionType === "email") return <Mail className="w-3.5 h-3.5 text-blue-600" />;
    return <Users className="w-3.5 h-3.5 text-rose-600" />;
  };

  const getItemIconBg = (item) => {
    if (item.type === "note") return "bg-amber-100";
    if (item.type === "deal") return "bg-emerald-100";
    if (item.interactionType === "call") return "bg-purple-100";
    if (item.interactionType === "email") return "bg-blue-100";
    return "bg-rose-100";
  };

  const getAvatarBg = (item) => {
    if (item.type === "deal") return "bg-emerald-600";
    if (item.type === "note") return "bg-indigo-600";
    if (item.interactionType === "call") return "bg-purple-600";
    if (item.interactionType === "email") return "bg-blue-600";
    return "bg-rose-600";
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className="text-sm font-semibold text-slate-700">
          Activity Timeline ({filteredActivity.length}{hasActiveFilters ? ` of ${mergedActivity.length}` : ""})
        </span>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-slate-500 hover:text-red-500" onClick={clearFilters}>
              <X className="w-3 h-3" />
            </Button>
          )}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={hasActiveFilters ? "default" : "outline"}
                className="h-6 px-2 text-xs gap-1"
              >
                <SlidersHorizontal className="w-3 h-3" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <p className="text-xs font-semibold text-slate-700 mb-2">Filter by Type</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => toggleType(opt.value)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      selectedTypes.includes(opt.value)
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <p className="text-xs font-semibold text-slate-700 mb-2">Filter by Date Range</p>
              <div className="flex gap-2">
                {/* From */}
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 mb-1">From</p>
                  <Popover open={showFromCal} onOpenChange={setShowFromCal}>
                    <PopoverTrigger asChild>
                      <button className="w-full text-xs border border-slate-200 rounded px-2 py-1 text-left text-slate-700 hover:border-slate-400 transition-colors">
                        {dateFrom ? moment(dateFrom).format("MMM D, YYYY") : "Any"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(d) => { setDateFrom(d); setShowFromCal(false); }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {/* To */}
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 mb-1">To</p>
                  <Popover open={showToCal} onOpenChange={setShowToCal}>
                    <PopoverTrigger asChild>
                      <button className="w-full text-xs border border-slate-200 rounded px-2 py-1 text-left text-slate-700 hover:border-slate-400 transition-colors">
                        {dateTo ? moment(dateTo).format("MMM D, YYYY") : "Any"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(d) => { setDateTo(d); setShowToCal(false); }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 w-full text-xs text-slate-500 hover:text-red-500 transition-colors text-center"
                >
                  Clear all filters
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Timeline body */}
      <div className="px-4 py-3">
        {filteredActivity.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            {hasActiveFilters ? "No activity matches your filters" : "No activity yet"}
          </p>
        ) : (
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[13px] top-3 bottom-3 w-px bg-slate-200" />

            <div className="space-y-0">
              {filteredActivity.map((item, idx) => (
                <div key={`${item.type}-${item.id}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* Icon node on the line */}
                  <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${getItemIconBg(item)}`}>
                    {getItemIcon(item)}
                  </div>

                  {/* Card content */}
                  <div className="flex-1 min-w-0 bg-white border border-slate-100 rounded-lg px-3 py-2.5 shadow-sm hover:shadow-md transition-shadow">

                    {/* Note */}
                    {item.type === "note" && (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full ${getAvatarBg(item)} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
                              {getInitials(item.created_by)}
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{item.created_by?.split("@")[0] || "Unknown"}</span>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{moment(item.timestamp).fromNow()}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        {item.content && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: item.content.replace(/<[^>]*>/g, " ").trim() }}
                          />
                        )}
                      </>
                    )}

                    {/* Deal */}
                    {item.type === "deal" && (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full ${getAvatarBg(item)} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
                              {getInitials(item.created_by)}
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{item.created_by?.split("@")[0] || "Unknown"}</span>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{moment(item.timestamp).fromNow()}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {item.stage && (
                            <span className="text-xs text-slate-500">{lifecycleStages.find(s => s.id === item.stage)?.name || item.stage}</span>
                          )}
                          {item.value && (
                            <span className="text-xs font-medium text-emerald-700">${item.value.toLocaleString()}</span>
                          )}
                          {item.expected_close_date && (
                            <span className="text-xs text-slate-500">Close: {moment(item.expected_close_date).format("MMM D, YYYY")}</span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Interaction (email / call / meeting) */}
                    {item.type === "interaction" && (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900">{item.subject}</p>
                          <span className="text-xs text-slate-400 flex-shrink-0">{moment(item.timestamp).fromNow()}</span>
                        </div>
                        <Badge className="mt-1 text-xs" variant="outline">
                          {item.interactionType?.charAt(0).toUpperCase() + item.interactionType?.slice(1)}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}