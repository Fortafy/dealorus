import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import moment from "moment";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

  const mergedActivity = [
    ...interactions.map((i) => ({
      ...i,
      type: "interaction",
      timestamp: i.created_date,
      icon: i.type === "email" ? "📧" : i.type === "call" ? "☎️" : "📅",
    })),
    ...notes.map((n) => ({
      ...n,
      type: "note",
      timestamp: n.created_date,
      icon: "📝",
    })),
    ...deals.map((d) => ({
      ...d,
      type: "deal",
      timestamp: d.created_date,
      icon: "💼",
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full group hover:opacity-80 transition-opacity">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Timeline ({mergedActivity.length})
            </CardTitle>
            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </CollapsibleTrigger>
        </Collapsible>
      </CardHeader>

      {isOpen && <CardContent>
        {mergedActivity.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No activity yet</p>
        ) : (
          <div className="space-y-3">
            {mergedActivity.map((item, index) => (
              <div key={`${item.type}-${item.id}`} className="flex gap-3 pb-3 border-b border-slate-200 last:border-0">
                <div className="text-lg flex-shrink-0 mt-1">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{item.type === "interaction" ? item.subject : item.type === "note" ? item.title : item.name}</p>
                    <span className="text-xs text-slate-500">{moment(item.timestamp).fromNow()}</span>
                  </div>
                  {item.type === "interaction" && (
                    <Badge className="mt-1 text-xs" variant="outline">
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Badge>
                  )}
                  {item.type === "deal" && (
                    <div className="flex gap-1 mt-1">
                      {item.value && <Badge className="text-xs">${item.value.toLocaleString()}</Badge>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>}
    </Card>
  );
}