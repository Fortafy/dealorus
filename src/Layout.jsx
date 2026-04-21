import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";

// Pages that manage their own sidebar/layout
const HIDE_SIDEBAR_PATHS = ["/Settings"];

export default function Layout({ children }) {
  const location = useLocation();
  const hideSidebar = HIDE_SIDEBAR_PATHS.includes(location.pathname);

  if (hideSidebar) {
    return <div className="h-screen bg-slate-50 overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef2f8]">
      <div className="flex h-full w-full items-center justify-center px-0 py-0">
        <div className="flex h-[calc(100vh-48px)] w-[calc(100vw-32px)] overflow-hidden rounded-[18px] border border-[#dbe3f0] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-white">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}