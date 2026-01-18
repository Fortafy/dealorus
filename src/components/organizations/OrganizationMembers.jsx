import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Loader, AlertCircle, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";

function InviteOrganizationUserDialog({ open, onOpenChange, organizationId, organizationName, currentUserCount, maxUsers }) {
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (email) => {
      if (!email || !email.includes("@")) {
        throw new Error("Please enter a valid email address.");
      }
      if (currentUserCount >= maxUsers) {
        throw new Error(`Cannot invite more users. Your plan allows up to ${maxUsers} users.`);
      }

      // Invite user to platform
      await base44.users.inviteUser(email, "user");

      // Retry to find the newly created user and update their organization
      let invitedUser = null;
      for (let i = 0; i < 10; i++) {
        const users = await base44.entities.User.filter({ email });
        if (users.length > 0) {
          invitedUser = users[0];
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!invitedUser) {
        throw new Error("Could not find the invited user after creation.");
      }

      return await base44.entities.User.update(invitedUser.id, {
        organization_id: organizationId,
        organization_role: "member",
        is_active: true,
      });
    },
    onSuccess: () => {
      setInviteSuccess("User invited successfully!");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["organizationUsers", organizationId] });
      setTimeout(() => {
        onOpenChange(false);
        setInviteSuccess(null);
      }, 1500);
    },
    onError: (err) => {
      setInviteError(err.message || "Failed to invite user");
    },
  });

  const canInvite = currentUserCount < maxUsers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member to {organizationName}</DialogTitle>
          <DialogDescription>
            Current members: {currentUserCount} / {maxUsers}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {inviteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{inviteError}</AlertDescription>
            </Alert>
          )}
          {inviteSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{inviteSuccess}</AlertDescription>
            </Alert>
          )}
          {!canInvite && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>User Limit Reached</AlertTitle>
              <AlertDescription>
                Your organization has reached its maximum of {maxUsers} active users. Deactivate an existing member to invite new ones.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              disabled={inviteMutation.isPending || !canInvite}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={inviteMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => inviteMutation.mutate(email)}
            disabled={inviteMutation.isPending || !canInvite || !email}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {inviteMutation.isPending ? (
              <><Loader className="w-4 h-4 mr-2 animate-spin" /> Inviting...</>
            ) : (
              "Invite"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function OrganizationMembers({ organizationId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("full_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);
  const [actionError, setActionError] = useState(null);
  const queryClient = useQueryClient();

  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: async () => base44.entities.Organization.get(organizationId),
    enabled: !!organizationId,
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["organizationUsers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return await base44.entities.User.filter({ organization_id: organizationId }, "-created_date");
    },
    enabled: !!organizationId,
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ userId, isActive }) => base44.entities.User.update(userId, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizationUsers", organizationId] });
      setDeactivateConfirm(null);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err.message || "Failed to change user status");
    },
  });

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          user.full_name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        const aVal = a[sortField] || "";
        const bVal = b[sortField] || "";
        const comparison = aVal.toString().localeCompare(bVal.toString(), undefined, { numeric: true });
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [users, searchQuery, sortField, sortDirection]);

  const currentActiveUsers = useMemo(() => {
    return users.filter(user => user.is_active !== false).length;
  }, [users]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const maxUsers = organization?.max_users || 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Team Members</h2>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoadingOrg || currentActiveUsers >= maxUsers}
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>

        {actionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Members ({currentActiveUsers}/{maxUsers})</CardTitle>
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
            {(isLoadingOrg || isLoadingUsers) ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No members found</p>
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
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Role</th>
                      <th
                        className="text-left py-3 px-4 font-semibold text-slate-900 text-sm cursor-pointer hover:text-slate-700"
                        onClick={() => handleSort("is_active")}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {sortField === "is_active" ? (
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
                      <th className="text-right py-3 px-4 font-semibold text-slate-900 text-sm">Actions</th>
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
                              user.organization_role === "admin"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-800"
                            }
                          >
                            {user.organization_role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              user.is_active === false
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {user.is_active === false ? "Inactive" : "Active"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeactivateConfirm(user)}
                            className={
                              user.is_active === false
                                ? "h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                : "h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            }
                            disabled={user.organization_role === "admin"}
                          >
                            {user.is_active === false ? "Activate" : "Deactivate"}
                          </Button>
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

      <InviteOrganizationUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        organizationId={organizationId}
        organizationName={organization?.name}
        currentUserCount={currentActiveUsers}
        maxUsers={maxUsers}
      />

      <AlertDialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateConfirm?.is_active === false ? "Activate User?" : "Deactivate User?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {deactivateConfirm?.is_active === false ? "activate" : "deactivate"} <strong>{deactivateConfirm?.full_name}</strong>?
              They will {deactivateConfirm?.is_active === false ? "be able to log in" : "not be able to log in"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deactivateMutation.mutate({
                  userId: deactivateConfirm.id,
                  isActive: !deactivateConfirm.is_active,
                })
              }
              className={deactivateConfirm?.is_active === false ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {deactivateMutation.isPending ? "Updating..." : (deactivateConfirm?.is_active === false ? "Activate" : "Deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}