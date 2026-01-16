import React from "react";
import { Search, Building2, Database } from "lucide-react";
import { motion } from "framer-motion";

export default function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
          <Building2 className="w-12 h-12 text-indigo-600" />
        </div>
        <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg">
          <Database className="w-5 h-5 text-white" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-slate-800 mb-2">
        Search for an Organization
      </h3>
      <p className="text-slate-500 text-center max-w-md mb-6">
        Enter an organization name and state to enrich your data with information from public databases including ProPublica, IRS records, and more.
      </p>
      
      <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-400">
        <span className="px-3 py-1.5 bg-slate-50 rounded-full">EIN Numbers</span>
        <span className="px-3 py-1.5 bg-slate-50 rounded-full">Contact Info</span>
        <span className="px-3 py-1.5 bg-slate-50 rounded-full">Revenue Data</span>
        <span className="px-3 py-1.5 bg-slate-50 rounded-full">Tax Status</span>
      </div>
    </motion.div>
  );
}