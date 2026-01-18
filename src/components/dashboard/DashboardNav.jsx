import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Settings,
  BarChart3,
  Building2,
  Palette,
  CreditCard,
} from "lucide-react";

export default function DashboardNav({ activeSection, onSectionChange, isAdmin, isBaseAdmin }) {
  const userSections = [
    {
      id: "profile",
      label: "Personal Profile",
      icon: User,
    },
    {
      id: "settings",
      label: "Personal Settings",
      icon: Settings,
    },
  ];

  const orgSections = isAdmin ? [
    {
      id: "metrics",
      label: "Dashboard Metrics",
      icon: BarChart3,
    },
    {
      id: "organization-settings",
      label: "Organization Settings",
      icon: Building2,
    },
    {
      id: "branding",
      label: "Branding & Logo",
      icon: Palette,
    },
    {
      id: "subscription",
      label: "Subscription & Billing",
      icon: CreditCard,
    },
  ] : [];

  const adminSections = isBaseAdmin ? [
    {
      id: "admin-organizations",
      label: "Manage Organizations",
      icon: Building2,
    },
  ] : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* User Section */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 mb-2">
            User
          </h3>
          <div className="space-y-2">
            {userSections.map((section) => {
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
          </div>
        </div>

        {/* Organization Section */}
        {orgSections.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 mb-2">
                Organization
              </h3>
              <div className="space-y-2">
                {orgSections.map((section) => {
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
              </div>
            </div>
          </>
        )}

        {/* Administrator Section */}
        {adminSections.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 mb-2">
                Administrator
              </h3>
              <div className="space-y-2">
                {adminSections.map((section) => {
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
              </div>
            </div>
          </>
        )}
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