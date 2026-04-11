import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Users, Briefcase, Settings, BookOpen, ScrollText, HelpCircle, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { base44 } from "@/api/base44Client";
import dealorusNewIcon from "@/assets/dealorus-new-icon.png";

const NAV_ITEMS = [
{ label: "Organizations", icon: Building2, path: "/Organizations" },
{ label: "People", icon: Users, path: "/People" },
{ label: "Deals", icon: Briefcase, path: "/Deals" }];


export default function Sidebar() {
  const location = useLocation();
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

  const initials = currentUser?.full_name?.split(" ").map((n) => n[0]).join("") || "U";

  const handleLogout = () => {
    base44.auth.logout();
  };

  const menuItems = [
  { label: "Documentation", icon: BookOpen, path: "/ComingSoon" },
  { label: "Changelog", icon: ScrollText, path: "/ComingSoon" },
  { label: "Get Help", icon: HelpCircle, path: "/ComingSoon" },
  { label: "Settings", icon: Settings, path: "/Settings" }];


  return (
    <aside className="w-24 flex-shrink-0 h-screen bg-slate-50 border-r border-slate-200 flex flex-col items-center">
      {/* Logo */}
      <div className="w-full px-4 py-5 flex-shrink-0 flex justify-center">
        <div className="w-full max-w-[64px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <img
            src={dealorusNewIcon}
            alt="Dealorus app icon"
            className="aspect-square h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="w-full flex-1 overflow-y-auto py-4 px-2">
        <div className="flex flex-col items-center gap-1.5">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path || location.pathname === "/";
          return (
            <Link
              key={label}
              to={path}
              className={`w-full max-w-[64px] rounded-2xl px-1.5 py-1.5 transition-colors ${
              isActive ?
              "bg-slate-100 text-slate-900" :
              "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`
              }
            >
              <div className="flex flex-col items-center gap-0.5 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-transparent">
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                </div>
                <span className="text-[8px] font-semibold leading-none">{label}</span>
              </div>
            </Link>
          );

        })}
        </div>
      </nav>

      {/* Bottom: Avatar popup */}
      <div className="w-full border-t border-slate-200 px-2 py-4 flex-shrink-0 relative" ref={menuRef}>
        {/* Popup Menu */}
        {menuOpen &&
        <div className="absolute bottom-full left-full ml-3 w-64 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">{currentUser?.full_name || "My Account"}</p>
              <p className="text-xs text-slate-500">{currentUser?.email || ""}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              {menuItems.map(({ label, icon: Icon, path }) =>
            <Link
              key={label}
              to={path}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
              
                  <Icon className="w-4 h-4 text-slate-500" />
                  {label}
                </Link>
            )}
            </div>

            {/* Logout */}
            <div className="border-t border-slate-100 py-1">
              <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
              
                <LogOut className="w-4 h-4 text-slate-500" />
                Logout
              </button>
            </div>
          </div>
        }

        {/* Avatar trigger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className={`mx-auto flex w-full max-w-[64px] flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1.5 transition-colors ${
            menuOpen ? "bg-slate-100 text-slate-900" : "hover:bg-slate-100 text-slate-500"
          }`}
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-[8px] font-semibold leading-none">User</span>
        </button>
      </div>
    </aside>);

}
