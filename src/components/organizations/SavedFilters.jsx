import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Star, Bookmark, Trash2, MoreVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SavedFilters({ currentFilters, onApplyFilter, clientId, userId }) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const { data: savedFilters = [] } = useQuery({
    queryKey: ["savedFilters", clientId, userId],
    queryFn: () => base44.entities.SavedFilter.filter({ client_id: clientId, user_id: userId }, "-created_date"),
    enabled: !!clientId && !!userId,
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedFilter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SavedFilter.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters"] });
    },
  });

  const handleSave = () => {
    if (!filterName.trim()) {
      setError("Please enter a filter name");
      return;
    }

    // Check if any filters are set
    const hasFilters = Object.values(currentFilters).some(val => val && val !== "");
    if (!hasFilters) {
      setError("No filters to save. Please set at least one filter.");
      return;
    }

    saveMutation.mutate({
      client_id: clientId,
      user_id: userId,
      name: filterName,
      filters: currentFilters,
      is_default: false,
    });
  };

  const toggleDefault = (filter) => {
    // Unset all other defaults first
    savedFilters.forEach(f => {
      if (f.id !== filter.id && f.is_default) {
        updateMutation.mutate({ id: f.id, data: { is_default: false } });
      }
    });
    
    updateMutation.mutate({ 
      id: filter.id, 
      data: { is_default: !filter.is_default } 
    });
  };

  // Apply default filter on mount
  React.useEffect(() => {
    const defaultFilter = savedFilters.find(f => f.is_default);
    if (defaultFilter && !Object.values(currentFilters).some(val => val && val !== "")) {
      onApplyFilter(defaultFilter.filters);
    }
  }, [savedFilters]);

  const hasActiveFilters = Object.values(currentFilters).some(val => val && val !== "");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          disabled={!hasActiveFilters}
          className="flex-1"
        >
          <Bookmark className="w-3 h-3 mr-2" />
          Save Current Filters
        </Button>
      </div>

      {savedFilters.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Saved Filters:</p>
          {savedFilters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <button
                onClick={() => onApplyFilter(filter.filters)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  {filter.is_default && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  <span className="text-sm font-medium text-slate-700">{filter.name}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {filter.filters.state && <Badge variant="outline" className="text-xs">State: {filter.filters.state}</Badge>}
                  {filter.filters.organization_type && <Badge variant="outline" className="text-xs">Type: {filter.filters.organization_type}</Badge>}
                  {filter.filters.ntee_code && <Badge variant="outline" className="text-xs">NTEE: {filter.filters.ntee_code}</Badge>}
                  {(filter.filters.min_revenue || filter.filters.max_revenue) && (
                    <Badge variant="outline" className="text-xs">
                      Revenue: {filter.filters.min_revenue || "0"} - {filter.filters.max_revenue || "∞"}
                    </Badge>
                  )}
                </div>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleDefault(filter)}>
                    <Star className={`w-4 h-4 mr-2 ${filter.is_default ? 'fill-amber-500 text-amber-500' : ''}`} />
                    {filter.is_default ? "Unset Default" : "Set as Default"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate(filter.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

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

            <div className="space-y-2">
              <p className="text-sm font-medium">Current Filters:</p>
              <div className="flex flex-wrap gap-2">
                {currentFilters.state && <Badge>State: {currentFilters.state}</Badge>}
                {currentFilters.organization_type && <Badge>Type: {currentFilters.organization_type}</Badge>}
                {currentFilters.ntee_code && <Badge>NTEE: {currentFilters.ntee_code}</Badge>}
                {currentFilters.min_revenue && <Badge>Min Revenue: ${currentFilters.min_revenue}</Badge>}
                {currentFilters.max_revenue && <Badge>Max Revenue: ${currentFilters.max_revenue}</Badge>}
              </div>
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