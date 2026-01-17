import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EnrichmentComparisonDialog({ 
  open, 
  onOpenChange, 
  currentData, 
  enrichedData, 
  onApply 
}) {
  const [selectedFields, setSelectedFields] = useState({});

  const fields = [
    { key: "organization_name", label: "Organization Name" },
    { key: "ein", label: "EIN" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip_code", label: "ZIP Code" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "website", label: "Website" },
    { key: "organization_type", label: "Organization Type" },
    { key: "mission", label: "Mission" },
    { key: "annual_revenue", label: "Annual Revenue" },
    { key: "ntee_code", label: "NTEE Code" },
    { key: "ruling_date", label: "Ruling Date" },
  ];

  const changedFields = fields.filter(field => {
    const current = currentData[field.key];
    const enriched = enrichedData[field.key];
    
    // Consider it changed if enriched has a value and it's different from current
    if (!enriched || enriched === "N/A" || enriched === "Not found" || enriched === "null") {
      return false;
    }
    
    // If current is empty/null and enriched has a value, it's a change
    if (!current && enriched) return true;
    
    // If both have values and they're different, it's a change
    return current !== enriched;
  });

  const handleToggle = (fieldKey) => {
    setSelectedFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = {};
    changedFields.forEach(field => {
      allSelected[field.key] = true;
    });
    setSelectedFields(allSelected);
  };

  const handleDeselectAll = () => {
    setSelectedFields({});
  };

  const handleApply = () => {
    const updates = {};
    Object.keys(selectedFields).forEach(key => {
      if (selectedFields[key]) {
        updates[key] = enrichedData[key];
      }
    });
    onApply(updates);
    setSelectedFields({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Review Enrichment Changes</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Select which fields you want to update from the enriched data
          </p>
        </DialogHeader>

        {changedFields.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600 font-medium mb-1">No Changes Found</p>
            <p className="text-sm text-slate-400">
              The enriched data matches your current record
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs">
                {changedFields.length} field{changedFields.length !== 1 ? "s" : ""} changed
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-7 text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {changedFields.map(field => {
                  const currentValue = currentData[field.key] || "(empty)";
                  const enrichedValue = enrichedData[field.key] || "(empty)";
                  
                  return (
                    <div
                      key={field.key}
                      className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedFields[field.key] || false}
                          onCheckedChange={() => handleToggle(field.key)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 mb-2">
                            {field.label}
                          </p>
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                            <div className="min-w-0">
                              <p className="text-xs text-slate-500 mb-1">Current</p>
                              <p className="text-sm text-slate-900 break-words">
                                {currentValue}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-slate-500 mb-1">New</p>
                              <p className="text-sm text-indigo-600 font-medium break-words">
                                {enrichedValue}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedFields({});
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={Object.values(selectedFields).filter(Boolean).length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Apply Selected Changes ({Object.values(selectedFields).filter(Boolean).length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}