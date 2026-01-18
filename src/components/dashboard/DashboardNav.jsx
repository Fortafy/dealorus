import React from "react";
import { Button } from "@/components/ui/button";
import {
  User,
  Settings,
  BarChart3,
  Building2,
  Palette,
  CreditCard,
} from "lucide-react";

export default function DashboardNav({ activeSection, onSectionChange, isAdmin, isBaseAdmin }) {
  const sections = [
    {
      id: "profile",
      label: "Personal Profile",
      icon: User,
      admin: false,
    },
    {
      id: "settings",
      label: "Personal Settings",
      icon: Settings,
      admin: false,
    },
    ...(isBaseAdmin ? [
      {
        id: "admin-organizations",
        label: "Manage Organizations",
        icon: Building2,
        admin: true,
      },
    ] : []),
    ...(isAdmin ? [
      {
        id: "metrics",
        label: "Dashboard Metrics",
        icon: BarChart3,
        admin: true,
      },
      {
        id: "organization-settings",
        label: "Organization Settings",
        icon: Building2,
        admin: true,
      },
      {
        id: "branding",
        label: "Branding & Logo",
        icon: Palette,
        admin: true,
      },
      {
        id: "subscription",
        label: "Subscription & Billing",
        icon: CreditCard,
        admin: true,
      },
    ] : []),
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-900">Navigation</h2>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <Button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start text-left ${
                isActive
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
              <span className="truncate">{section.label}</span>
            </Button>
          );
        })}
      </nav>

      {isBaseAdmin && (
        <div className="p-4 border-t border-slate-100 flex-shrink-0 bg-gradient-to-b from-amber-50 to-transparent">
          <div className="text-xs text-amber-600 font-medium mb-2">PLATFORM ADMIN</div>
          <p className="text-xs text-amber-700 leading-relaxed">
            You have platform administrator access and can manage all organizations.
          </p>
        </div>
      )}
      {isAdmin && !isBaseAdmin && (
        <div className="p-4 border-t border-slate-100 flex-shrink-0 bg-gradient-to-b from-slate-50 to-transparent">
          <div className="text-xs text-slate-500 font-medium mb-2">ORG ADMIN</div>
          <p className="text-xs text-slate-600 leading-relaxed">
            You have organization administrator access and can manage all settings and view metrics.
          </p>
        </div>
      )}
    </div>
  );
}