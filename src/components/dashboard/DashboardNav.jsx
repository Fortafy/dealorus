import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Settings,
  Bell,
  Building2,
  CreditCard,
  Link2,
  Users,
  Database,
  Merge,
  ArrowUpFromLine,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function DashboardNav({ activeSection, onSectionChange, isAdmin, isBaseAdmin, organization, currentUser }) {
  const userSections = [
    {
      id: "preferences",
      label: "Preferences",
      icon: Settings,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
    },
  ];

  const orgSections = isAdmin ? [
    {
      id: "subscription",
      label: "Subscription & Billing",
      icon: CreditCard,
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
      id: "data-hygiene",
      label: "Data Hygiene",
      icon: Merge,
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: Link2,
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
    {
      id: "admin-api-usage",
      label: "API Usage",
      icon: Activity,
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
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {/* User Section */}
        <div>
          <h3 className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Account
          </h3>
          <div className="space-y-1">
            {userSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <Button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  variant="ghost"
                  className={`mb-0.5 h-auto w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium ${
                    isActive
                      ? "bg-slate-200 text-slate-900 hover:bg-slate-200 hover:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
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
              <h3 className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Workspace
              </h3>
              <div className="space-y-1">
                {orgSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <Button
                        key={section.id}
                        onClick={() => onSectionChange(section.id)}
                        variant="ghost"
                        className={`mb-0.5 h-auto w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium ${
                         isActive
                           ? "bg-slate-200 text-slate-900 hover:bg-slate-200 hover:text-slate-900"
                           : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                       }`}
                       
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
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
              <h3 className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Administrator
              </h3>
              <div className="space-y-1">
                {adminSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <Button
                        key={section.id}
                        onClick={() => onSectionChange(section.id)}
                        variant="ghost"
                        className={`mb-0.5 h-auto w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium ${
                         isActive
                           ? "bg-slate-200 text-slate-900 hover:bg-slate-200 hover:text-slate-900"
                           : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                       }`}
                       
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
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
            You have workspace administrator access and can manage all workspace settings.
          </p>
        </div>
      )}
    </div>
  );
}