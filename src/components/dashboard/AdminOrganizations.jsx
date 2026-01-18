import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Trash2, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Loader, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import CreateOrganizationDialog from "./CreateOrganizationDialog";
import EditOrganizationDialog from "./EditOrganizationDialog";

export default function AdminOrganizations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      return await base44.entities.Organization.list("-created_date");
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      return await base44.entities.User.list();
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: (orgId) => base44.entities.Organization.delete(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setDeleteConfirm(null);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || "Failed to delete organization");
    },
  });

  const filteredOrgs = useMemo(() => {
    return organizations
      .filter((org) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          org.name?.toLowerCase().includes(searchLower) ||
          org.subscription_plan?.toLowerCase().includes(searchLower) ||
          org.subscription_status?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        const aVal = a[sortField] || "";
        const bVal = b[sortField] || "";
        const comparison = aVal.toString().localeCompare(bVal.toString(), undefined, { numeric: true });
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [organizations, searchQuery, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getAdminName = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    return user?.full_name || "Unknown Admin";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Manage Organizations</h2>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Organization
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Organizations</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search organizations..."
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No organizations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th
                        className="text-left py-3 px-4 font-semibold text-slate-900 text-sm cursor-pointer hover:text-slate-700"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          {sortField === "name" ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 font-semibold text-slate-900 text-sm cursor-pointer hover:text-slate-700"
                        onClick={() => handleSort("subscription_plan")}
                      >
                        <div className="flex items-center gap-2">
                          Plan
                          {sortField === "subscription_plan" ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 font-semibold text-slate-900 text-sm cursor-pointer hover:text-slate-700"
                        onClick={() => handleSort("subscription_status")}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {sortField === "subscription_status" ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                        Admin
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900 text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgs.map((org, index) => (
                      <motion.tr
                        key={org.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{org.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize">
                            {org.subscription_plan}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`capitalize ${
                              org.subscription_status === "active"
                                ? "bg-green-100 text-green-800"
                                : org.subscription_status === "trial"
                                ? "bg-blue-100 text-blue-800"
                                : org.subscription_status === "suspended"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {org.subscription_status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-slate-600">
                            {getAdminName(org.admin_user_id)}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingOrg(org)}
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(org)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        allUsers={allUsers}
      />

      {/* Edit Organization Dialog */}
      {editingOrg && (
        <EditOrganizationDialog
          open={!!editingOrg}
          onOpenChange={(open) => !open && setEditingOrg(null)}
          organization={editingOrg}
          allUsers={allUsers}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOrgMutation.mutate(deleteConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteOrgMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}