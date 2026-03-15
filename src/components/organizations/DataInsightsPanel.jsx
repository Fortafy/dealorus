import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Link2, ChevronDown, ChevronUp } from "lucide-react";
import moment from "moment";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getDataSourceLinks } from "@/components/utils/dataSourceLinks";
import { ExternalLink, FileText, Building2, FileCheck, Award, Globe } from "lucide-react";

export default function DataInsightsPanel({ organization, isCollapsed }) {
  const [isDataFreshnessOpen, setIsDataFreshnessOpen] = useState(false);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);

  const formatLastChecked = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const dataSourceLinks = getDataSourceLinks(organization);

  const getIconComponent = (iconName) => {
    const icons = {
      FileText,
      Building2,
      FileCheck,
      Award,
      Globe,
    };
    return icons[iconName] || Link2;
  };

  return (
    <div className="space-y-4">
      {organization.source_metadata && Object.keys(organization.source_metadata).length > 0 && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3 bg-slate-50 border-b border-slate-200">
            <Collapsible open={isDataFreshnessOpen} onOpenChange={setIsDataFreshnessOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full group hover:opacity-80 transition-opacity">
                <CardTitle className="text-base">
                  Data Freshness
                </CardTitle>
                {isDataFreshnessOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(organization.source_metadata).map(([source, metadata]) => (
                      <div key={source} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                        <span className="text-xs font-medium text-slate-700">{source}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatLastChecked(metadata?.last_checked)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
        </Card>
      )}


    </div>
  );
}