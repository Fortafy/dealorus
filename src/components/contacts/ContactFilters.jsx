import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Filter } from "lucide-react";

export default function ContactFilters({ onFilterChange, onClose }) {
  const [titleSearch, setTitleSearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);

  const handleApplyFilters = () => {
    onFilterChange({
      title: titleSearch,
      department: departmentSearch,
      starredOnly
    });
  };

  const handleClearFilters = () => {
    setTitleSearch("");
    setDepartmentSearch("");
    setStarredOnly(false);
    onFilterChange({
      title: "",
      department: "",
      starredOnly: false
    });
  };

  return (
    <div className="bg-slate-50 border-b border-slate-200 p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-600" />
          <h4 className="font-medium text-slate-900">Filter Contacts</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Job Title
          </label>
          <Input
            placeholder="e.g., Executive Director, Manager..."
            value={titleSearch}
            onChange={(e) => setTitleSearch(e.target.value)}
            className="text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Department
          </label>
          <Input
            placeholder="e.g., Development, Operations..."
            value={departmentSearch}
            onChange={(e) => setDepartmentSearch(e.target.value)}
            className="text-sm"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={starredOnly}
            onChange={(e) => setStarredOnly(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">Show starred only</span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApplyFilters}
            className="bg-indigo-600 hover:bg-indigo-700 flex-1 h-8 text-sm"
          >
            Apply Filters
          </Button>
          <Button
            onClick={handleClearFilters}
            variant="outline"
            className="flex-1 h-8 text-sm"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}