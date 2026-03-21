import React from "react";
import { Construction } from "lucide-react";

export default function ComingSoon() {
  return (
    <div className="h-full flex items-center justify-center bg-white">
      <div className="text-center">
        <Construction className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Coming Soon</h1>
        <p className="text-slate-500 text-sm">This page is under construction. Check back soon!</p>
      </div>
    </div>
  );
}