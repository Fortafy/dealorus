import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Users, Plus, Shield, AlertCircle, Loader, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import InviteUserDialog from "./InviteUserDialog";
import { isOrgAdmin } from "@/components/utils/roleChecking";

export default function UserManagement({ organizationId, currentUser }) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["organization-users", organizationId],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.organization_id === organizationId);
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId) => {
      // Note: This would need a backend function to properly remove user from organization
      // For now, we'll update the user's organization_id to null
      await base44.entities.User.update(userId, { organization_id: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-users", organizationId] });
      setRemoveConfirm(null);
    },
    onError: (err) => {
      setError(err.message || "Failed to remove user");
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      await base44.entities.User.update(userId, { organization_role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-users", organizationId] });
    },
    onError: (err) => {
      setError(err.message || "Failed to change user role");
    },
  });

  // Only org admins can manage users
  if (!isOrgAdmin(currentUser)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage organization users. Only administrators can perform this action.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organization Users
          </CardTitle>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">No users in this organization</p>
              <p className="text-sm text-slate-500 mt-1">Invite users to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                      Role
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-900 text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
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
                        <p className="text-slate-600 text-sm">{user.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        {currentUser.id === user.id ? (
                          <Badge
                            className={
                              user.organization_role === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {user.organization_role === "admin" ? (
                              <>
                                <Shield className="w-3 h-3 mr-1" />
                                Administrator (You)
                              </>
                            ) : (
                              "Member (You)"
                            )}
                          </Badge>
                        ) : (
                          <Select
                            value={user.organization_role || "member"}
                            onValueChange={(newRole) =>
                              changeRoleMutation.mutate({ userId: user.id, newRole })
                            }
                            disabled={changeRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {currentUser.id !== user.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemoveConfirm(user)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        organizationId={organizationId}
      />

      {/* Remove User Confirmation */}
      <AlertDialog open={!!removeConfirm} onOpenChange={() => setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{removeConfirm?.full_name}</strong> from this
              organization? They will lose access to all organization data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeUserMutation.mutate(removeConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {removeUserMutation.isPending ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}