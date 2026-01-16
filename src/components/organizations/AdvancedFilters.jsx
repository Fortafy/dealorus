import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

export default function AdvancedFilters({ filters, onFilterChange, onClear }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-600" />
          <span className="font-semibold text-sm text-slate-700">Advanced Filters</span>
        </div>
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
      </div>

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

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Min Revenue</label>
          <Input
            type="number"
            value={filters.min_revenue || ""}
            onChange={(e) => handleChange("min_revenue", e.target.value)}
            placeholder="$0"
            className="h-9 text-sm"
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Max Revenue</label>
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
  );
}