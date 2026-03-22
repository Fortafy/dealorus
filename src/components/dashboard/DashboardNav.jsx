import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Settings,
  BarChart3,
  Building2,
  CreditCard,
  Users,
  Database,
  Merge,
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function DashboardNav({ activeSection, onSectionChange, isAdmin, isBaseAdmin, organization, currentUser }) {
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
      id: "organization-members",
      label: "Team Members",
      icon: Users,
    },
    {
      id: "data-sources",
      label: "Data Sources",
      icon: Database,
    },
    {
      id: "find-duplicates",
      label: "Find Duplicates",
      icon: Merge,
    },
    {
      id: "sf-field-mapping",
      label: "Salesforce Field Mapping",
      icon: ArrowUpFromLine,
    },
    {
      id: "organization-settings",
      label: "Organization Settings",
      icon: Building2,
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
      label: "Manage Clients",
      icon: Building2,
    },
    {
      id: "admin-users",
      label: "Manage Users",
      icon: User,
    },
  ] : [];
  const [isPlatformAdminNoticeOpen, setIsPlatformAdminNoticeOpen] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Organization Header */}
      {organization && (
        <div className="p-4 text-white flex-shrink-0 border-b" style={{ backgroundColor: 'hsl(39, 100%, 50%)', borderColor: 'hsl(39, 100%, 45%)' }}>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-90">Workspace</p>
              <h3 className="text-lg font-bold text-white truncate">{organization.name}</h3>
            </div>
            <div className="space-y-1 pt-2 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}>
              <div className="flex items-center justify-between text-xs">
                <span className="opacity-90">Plan</span>
                <span className="font-semibold capitalize">{organization.subscription_plan || "Basic"}</span>
              </div>
              {currentUser && (
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-90">Admin</span>
                  <span className="font-semibold truncate ml-2">{currentUser.full_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto py-4 space-y-4">
        {/* User Section */}
        <div>
          <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2">
            Account
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
                  className={`h-auto w-full justify-start rounded-none px-4 py-3 text-left text-xs font-medium ${
                    isActive
                      ? "text-white hover:opacity-90"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  style={isActive ? { backgroundColor: 'hsl(39, 100%, 50%)' } : {}}
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
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2">
                Workspace
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
                        className={`h-auto w-full justify-start rounded-none px-4 py-3 text-left text-xs font-medium ${
                         isActive
                           ? "text-white hover:opacity-90"
                           : "text-slate-700 hover:bg-slate-100"
                       }`}
                       style={isActive ? { backgroundColor: 'hsl(39, 100%, 50%)' } : {}}
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
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2">
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
                        className={`h-auto w-full justify-start rounded-none px-4 py-3 text-left text-xs font-medium ${
                         isActive
                           ? "text-white hover:opacity-90"
                           : "text-slate-700 hover:bg-slate-100"
                       }`}
                       style={isActive ? { backgroundColor: 'hsl(39, 100%, 50%)' } : {}}
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
        <div className="border-t border-slate-100 flex-shrink-0 bg-gradient-to-b from-amber-50 to-transparent">
          <button
            onClick={() => setIsPlatformAdminNoticeOpen((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-[10px] font-semibold tracking-wider text-amber-600">PLATFORM ADMIN</span>
            {isPlatformAdminNoticeOpen ? (
              <ChevronUp className="h-4 w-4 text-amber-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-amber-600" />
            )}
          </button>
          {isPlatformAdminNoticeOpen && (
            <p className="px-4 pb-4 text-xs leading-relaxed text-amber-700">
              You have platform administrator access and can manage all organizations.
            </p>
          )}
        </div>
      )}
      {isAdmin && !isBaseAdmin && (
        <div className="p-4 border-t border-slate-100 flex-shrink-0 bg-gradient-to-b from-slate-50 to-transparent">
          <div className="text-[10px] text-slate-500 font-medium tracking-wider mb-2">WORKSPACE ADMIN</div>
          <p className="text-xs text-slate-600 leading-relaxed">
            You have workspace administrator access and can manage all settings and view metrics.
          </p>
        </div>
      )}
    </div>
  );
}