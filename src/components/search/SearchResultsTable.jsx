import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Eye } from "lucide-react";

export default function SearchResultsTable({ results, onSelectOrganization, onSaveAll, onSaveSelected }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("organization_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const itemsPerPage = 25;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const parseRevenue = (revenueStr) => {
    if (!revenueStr) return 0;
    const cleaned = revenueStr.replace(/[$,]/g, "");
    return parseFloat(cleaned) || 0;
  };

  const sortedResults = [...results].sort((a, b) => {
    let aVal = a[sortField] || "";
    let bVal = b[sortField] || "";

    if (sortField === "annual_revenue") {
      aVal = parseRevenue(a.annual_revenue);
      bVal = parseRevenue(b.annual_revenue);
    }

    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = sortedResults.slice(startIndex, endIndex);

  const toggleSelection = (index) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedResults.map((_, i) => i)));
    }
  };

  const handleSaveSelected = () => {
    const selected = sortedResults.filter((_, i) => selectedIds.has(i));
    onSaveSelected(selected);
    setSelectedIds(new Set());
  };

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          Showing {startIndex + 1}-{Math.min(endIndex, sortedResults.length)} of {sortedResults.length} results
          {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
        </p>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button onClick={handleSaveSelected} variant="outline">
              Save {selectedIds.size} Selected
            </Button>
          )}
          <Button onClick={onSaveAll} className="bg-indigo-600 hover:bg-indigo-700">
            Save All {sortedResults.length}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === sortedResults.length && sortedResults.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold">
                  <SortButton field="organization_name">Organization Name</SortButton>
                </TableHead>
                <TableHead className="font-semibold">
                  <SortButton field="city">City</SortButton>
                </TableHead>
                <TableHead className="font-semibold">
                  <SortButton field="state">State</SortButton>
                </TableHead>
                <TableHead className="font-semibold">
                  <SortButton field="organization_type">Type</SortButton>
                </TableHead>
                <TableHead className="font-semibold">
                  <SortButton field="annual_revenue">Revenue</SortButton>
                </TableHead>
                <TableHead className="font-semibold">EIN</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentResults.map((org, pageIndex) => {
                const globalIndex = startIndex + pageIndex;
                return (
                  <TableRow key={globalIndex} className="hover:bg-slate-50">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(globalIndex)}
                        onCheckedChange={() => toggleSelection(globalIndex)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{org.organization_name}</TableCell>
                    <TableCell>{org.city || "N/A"}</TableCell>
                    <TableCell>{org.state || "N/A"}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {org.organization_type || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>{org.annual_revenue || "N/A"}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{org.ein || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectOrganization(org)}
                          className="h-8"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}