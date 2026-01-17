import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Filter } from "lucide-react";

export default function FilterDialog({ open, onOpenChange, onFilterChange, currentFilters }) {
  const [titleSearch, setTitleSearch] = useState(currentFilters.title || "");
  const [departmentSearch, setDepartmentSearch] = useState(currentFilters.department || "");
  const [starredOnly, setStarredOnly] = useState(currentFilters.starredOnly || false);

  const handleApplyFilters = () => {
    onFilterChange({
      title: titleSearch,
      department: departmentSearch,
      starredOnly
    });
    onOpenChange(false);
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Contacts</DialogTitle>
        </DialogHeader>

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
        </div>

        <DialogFooter>
          <Button
            onClick={handleClearFilters}
            variant="outline"
            className="text-sm"
          >
            Clear
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="bg-indigo-600 hover:bg-indigo-700 text-sm"
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}