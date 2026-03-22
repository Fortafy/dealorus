import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, Users, Briefcase, Settings, BookOpen, ScrollText, HelpCircle, LogOut, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { base44 } from "@/api/base44Client";

const NAV_ITEMS = [
  { label: "Organizations", icon: Building2, path: "/Organizations" },
  { label: "People", icon: Users, path: "/People" },
  { label: "Deals", icon: Briefcase, path: "/Deals" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = currentUser?.full_name?.split(" ").map(n => n[0]).join("") || "U";

  const handleLogout = () => {
    base44.auth.logout();
  };

  const menuItems = [
    { label: "Documentation", icon: BookOpen, path: "/ComingSoon" },
    { label: "Changelog", icon: ScrollText, path: "/ComingSoon" },
    { label: "Get Help", icon: HelpCircle, path: "/ComingSoon" },
    { label: "Settings", icon: Settings, path: "/Dashboard" },
  ];

  return (
    <aside className="w-56 flex-shrink-0 h-screen bg-slate-50 border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 flex-shrink-0">
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
          const isActive = location.pathname === path || location.pathname === "/";
          return (
            <Link
              key={label}
              to={path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium mb-0.5 transition-colors ${
                isActive
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Avatar popup */}
      <div className="border-t border-slate-100 px-3 py-4 flex-shrink-0 relative" ref={menuRef}>
        {/* Popup Menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">{currentUser?.full_name || "My Account"}</p>
              <p className="text-xs text-slate-500">{currentUser?.email || ""}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              {menuItems.map(({ label, icon: Icon, path }) => (
                <Link
                  key={label}
                  to={path}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Icon className="w-4 h-4 text-slate-500" />
                  {label}
                </Link>
              ))}
            </div>

            {/* Logout */}
            <div className="border-t border-slate-100 py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Avatar trigger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-full flex items-center gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-2 transition-colors"
        >
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-medium text-slate-800 truncate">{currentUser?.full_name || "My Account"}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || ""}</p>
          </div>
          <ChevronUp className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${menuOpen ? "" : "rotate-180"}`} />
        </button>
      </div>
    </aside>
  );
}