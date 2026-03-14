import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X, ChevronDown, Bookmark } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

export default function AdvancedFilters({ filters, onFilterChange, onClear, clientId, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const { data: clientData } = useQuery({
    queryKey: ["client", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const results = await base44.entities.Client.filter({ id: clientId });
      return results[0] || null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedFilter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters"] });
      setShowSaveDialog(false);
      setFilterName("");
      setError(null);
    },
    onError: (err) => {
      setError(err.message || "Failed to save filter");
    },
  });

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleSave = () => {
    if (!filterName.trim()) {
      setError("Please enter a filter name");
      return;
    }

    const hasFilters = Object.values(filters).some(val => val && val !== "");
    if (!hasFilters) {
      setError("No filters to save. Please set at least one filter.");
      return;
    }

    saveMutation.mutate({
      client_id: clientId,
      user_id: userId,
      name: filterName,
      filters: filters,
      is_default: false,
    });
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
            <span className="text-xs text-white px-2 py-1 rounded-full" style={{ backgroundColor: 'hsl(217, 91%, 60%)' }}>
              {Object.values(filters).filter(v => v).length}
            </span>
          )}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-auto"
          >
            <ChevronDown className="w-4 h-4 text-slate-600" />
          </motion.button>
        </button>
        <div className="flex items-center gap-2 ml-2">
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

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Source System</label>
            <Select value={filters.source_system || ""} onValueChange={(v) => handleChange("source_system", v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All sources</SelectItem>
                <SelectItem value="Salesforce">Salesforce</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
                <SelectItem value="AI Search">AI Search</SelectItem>
                <SelectItem value="CSV Import">CSV Import</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Lifecycle Stage</label>
            <Select value={filters.lifecycle_stage || ""} onValueChange={(v) => handleChange("lifecycle_stage", v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All stages</SelectItem>
                {clientData?.lifecycle_stages && clientData.lifecycle_stages.length > 0 ? (
                  clientData.lifecycle_stages
                    .sort((a, b) => a.order - b.order)
                    .map((stage) => (
                      <SelectItem key={stage.id} value={stage.name}>
                        {stage.name}
                      </SelectItem>
                    ))
                ) : (
                  <>
                    <SelectItem value="Prospect">Prospect</SelectItem>
                    <SelectItem value="In Conversation">In Conversation</SelectItem>
                    <SelectItem value="Agreement">Agreement</SelectItem>
                    <SelectItem value="Closed Won">Closed Won</SelectItem>
                    <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
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

        {clientId && userId && (
          <>
            <Separator className="my-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              disabled={!hasActiveFilters}
              className="w-full"
            >
              <Bookmark className="w-3 h-3 mr-2" />
              Save Filter
            </Button>
          </>
        )}
        </div>
      </motion.div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Combination</DialogTitle>
            <DialogDescription>
              Give your filter combination a name for quick access later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter Name</label>
              <Input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., California 501c3 Nonprofits"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: 'white' }}
            >
              {saveMutation.isPending ? "Saving..." : "Save Filter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}