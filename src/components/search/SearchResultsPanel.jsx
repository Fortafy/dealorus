import React, { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { performSearch } from "@/functions/searchUtils";

export default function SearchResultsPanel({ results, query, filters, onSelectResult }) {
  const [sortBy, setSortBy] = useState("relevance");
  const [sortDir, setSortDir] = useState("desc");

  const processedResults = useMemo(() => {
    return performSearch(results, query, filters, sortBy, sortDir);
  }, [results, query, filters, sortBy, sortDir]);

  const toggleSortDir = () => {
    setSortDir(sortDir === "asc" ? "desc" : "asc");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {processedResults.length} result{processedResults.length !== 1 ? "s" : ""} found
        </p>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="created_date">Created Date</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={toggleSortDir}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
            title={sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {sortDir === "asc" ? (
              <ArrowUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ArrowDown className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {processedResults.map((result) => (
          <button
            key={result.id}
            onClick={() => onSelectResult(result)}
            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
          >
            <p className="font-semibold text-sm text-slate-900">{result.organization_name}</p>
            <p className="text-xs text-slate-500 mt-1">
              {result.city}, {result.state} • {result.organization_type || "Nonprofit"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}