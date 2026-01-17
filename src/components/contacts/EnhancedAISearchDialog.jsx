import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

export default function EnhancedAISearchDialog({ open, onOpenChange, onSearch }) {
  const [criteria, setCriteria] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!criteria.trim()) return;
    
    setIsSearching(true);
    try {
      await onSearch(criteria);
      setCriteria("");
      onOpenChange(false);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Advanced AI Contact Search</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Search Criteria
            </label>
            <Textarea
              placeholder="Describe what you're looking for. Examples:
• Find all board members with development or fundraising experience
• Look for finance staff, especially CFO or controller roles
• Find contacts in marketing and communications departments
• Search for program directors with education background"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              className="h-32 text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Be specific about roles, departments, or skills you're looking for. The AI will search public sources for matching contacts.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSearching}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !criteria.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSearching ? "Searching..." : "Search Contacts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}