import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

export default function AdvancedFilters({ filters, onFilterChange, onClear }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1 hover:opacity-70 transition-opacity"
        >
          <Filter className="w-4 h-4 text-slate-600" />
          <span className="font-semibold text-sm text-slate-700">Advanced Filters</span>
          {hasActiveFilters && (
            <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">
              {Object.values(filters).filter(v => v).length}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-slate-600" />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">State</label>
            <Select value={filters.state || ""} onValueChange={(v) => handleChange("state", v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All states</SelectItem>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">City</label>
            <Input
              value={filters.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="e.g., Austin"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Organization Type</label>
            <Input
              value={filters.organization_type || ""}
              onChange={(e) => handleChange("organization_type", e.target.value)}
              placeholder="e.g., 501(c)(3)"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">NTEE Code</label>
            <Input
              value={filters.ntee_code || ""}
              onChange={(e) => handleChange("ntee_code", e.target.value)}
              placeholder="e.g., P20"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <Separator className="my-2" />

        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600">Annual Revenue Range</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Min</label>
              <Input
                type="number"
                value={filters.min_revenue || ""}
                onChange={(e) => handleChange("min_revenue", e.target.value)}
                placeholder="$0"
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Max</label>
              <Input
                type="number"
                value={filters.max_revenue || ""}
                onChange={(e) => handleChange("max_revenue", e.target.value)}
                placeholder="No limit"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600">Created Date Range</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">After</label>
              <Input
                type="date"
                value={filters.created_after || ""}
                onChange={(e) => handleChange("created_after", e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Before</label>
              <Input
                type="date"
                value={filters.created_before || ""}
                onChange={(e) => handleChange("created_before", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
        </div>
      </motion.div>
    </div>
  );
}