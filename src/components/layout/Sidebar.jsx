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
    <aside className="flex h-full w-[92px] flex-shrink-0 flex-col border-r border-[#22252b] bg-black">
      <div className="flex w-full justify-center px-4 pb-5 pt-6">
        <div className="flex h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-[16px] border border-[#2a2a2a] bg-[#111111] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <img
            src={dealorusNewIcon}
            alt="Dealorus app icon"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <nav className="flex w-full flex-1 flex-col items-center gap-3 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path || location.pathname === "/";
          return (
            <Link
              key={label}
              to={path}
              className={`flex w-full flex-col items-center gap-2 rounded-[18px] px-2 py-3 text-center transition-all ${
                isActive
                  ? "bg-[#1b1d22] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-[#2d3139]"
                  : "text-white/70 hover:bg-[#111318] hover:text-white"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${isActive ? "bg-[#23262d] text-[#8ab4ff]" : "bg-[#111111] text-[#b8c7ff] ring-1 ring-[#24262c]"}`}>
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              </div>
              <span className="text-[9px] font-semibold leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative mt-auto w-full border-t border-[#22252b] px-3 py-4" ref={menuRef}>
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

        <button
          onClick={() => setMenuOpen((o) => !o)}
          className={`mx-auto flex w-full flex-col items-center gap-2 rounded-[18px] px-2 py-3 transition-all ${
            menuOpen ? "bg-[#111318] text-white ring-1 ring-[#2d3139]" : "text-white/70 hover:bg-[#111318] hover:text-white"
          }`}
        >
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-[#3b82f6] text-white text-[10px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-[9px] font-semibold leading-none">User</span>
        </button>
      </div>
    </aside>);

}