import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";

// Pages that manage their own sidebar/layout
const HIDE_SIDEBAR_PATHS = ["/Dashboard"];

export default function Layout({ children }) {
  const location = useLocation();
  const hideSidebar = HIDE_SIDEBAR_PATHS.includes(location.pathname);

  if (hideSidebar) {
    return <div className="h-screen bg-slate-50 overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}