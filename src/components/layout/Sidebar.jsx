import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, LayoutDashboard, Settings, User, HelpCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/Dashboard" },
  { label: "Organizations", icon: Building2, path: "/Organizations" },
  { label: "Settings", icon: Settings, path: "/Settings" },
];

export default function Sidebar() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const initials = currentUser?.full_name?.split(" ").map(n => n[0]).join("") || "U";

  return (
    <aside className="w-56 flex-shrink-0 h-screen bg-white border-r border-slate-100 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100 flex-shrink-0">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696a507ebd3734abacaf302c/57bc5f9eb_Gemini_Generated_Image_an41ggan41ggan41.png"
          alt="Dealorus"
          className="h-9"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Objects</p>
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path || (path === "/Organizations" && location.pathname === "/");
          return (
            <Link
              key={label}
              to={path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                isActive
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Avatar + user name */}
      <div className="border-t border-slate-100 px-3 py-4 flex-shrink-0">
        <Link
          to={createPageUrl("Dashboard")}
          className="flex items-center gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-2 transition-colors"
        >
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-800 truncate">{currentUser?.full_name || "My Account"}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || ""}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}