import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import InviteUserDialog from "@/components/organizations/InviteUserDialog";
import EditUserDialog from "./EditUserDialog";

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("full_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["admin-users-current-user"],
    queryFn: () => base44.auth.me(),
  });

  const activeClientId = currentUser?.active_client_id || currentUser?.data?.active_client_id;
  const isPlatformAdmin = currentUser?.role === "admin";

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-all-client-users", isPlatformAdmin, activeClientId],
    enabled: !!currentUser,
    queryFn: async () => {
      if (isPlatformAdmin) {
        return await base44.entities.ClientUser.list("-created_date");
      }

      if (!activeClientId) {
        return [];
      }

      return await base44.entities.ClientUser.filter({ client_id: activeClientId }, "-created_date");
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-user-management-clients"],
    queryFn: async () => {
      return await base44.entities.Client.list();
    },
    enabled: isPlatformAdmin,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.ClientUser.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      setDeleteConfirm(null);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || "Failed to delete user");
    },
  });

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          user.full_name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.role?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        const aVal = a[sortField] || "";
        const bVal = b[sortField] || "";
        const comparison = aVal.toString().localeCompare(bVal.toString(), undefined, { numeric: true });
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [users, searchQuery, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getClientName = (clientId) => {
    if (!clientId) return "-";
    const client = clients.find((item) => item.id === clientId);
    return client?.name || "Unknown";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Manage Users</h2>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite User
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
              <CardTitle>Users</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
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
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th
                        className="text-left py-3 px-4 font-semibold text-slate-900 text-sm cursor-pointer hover:text-slate-700"
                        onClick={() => handleSort("full_name")}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          {sortField === "full_name" ? (
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
                        onClick={() => handleSort("email")}
                      >
                        <div className="flex items-center gap-2">
                          Email
                          {sortField === "email" ? (
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
                        onClick={() => handleSort("role")}
                      >
                        <div className="flex items-center gap-2">
                          Role
                          {sortField === "role" ? (
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
                        Client
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900 text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{user.full_name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-slate-600">{user.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              user.role === "admin"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-800"
                            }
                          >
                            {user.role}
                          </Badge>
                          {user.status === "pending" && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800">Pending</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-slate-600">
                            {getClientName(user.client_id)}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(user)}
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

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        clientId={!isPlatformAdmin ? activeClientId : undefined}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-all-client-users"] })}
      />

      {/* Edit User Dialog */}
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          organizations={clients}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.full_name}</strong> ({deleteConfirm?.email})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate(deleteConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}