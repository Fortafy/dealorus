import React, { useState, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Plus, Loader, AlertCircle, CheckCircle2, Users, X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import MemberEditDialog from "@/components/organizations/MemberEditDialog";

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

      const response = await base44.functions.invoke("inviteClientMember", {
        email,
        clientId: organizationId,
        organizationId,
        clientRole: 'member',
      });
      return response.data;
    },
    onSuccess: () => {
      setInviteSuccess("Invitation sent successfully!");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["organizationUsers", organizationId] });
      setTimeout(() => {
        onOpenChange(false);
        setInviteSuccess(null);
      }, 1500);
    },
    onError: (err) => {
      setInviteError(err?.response?.data?.error || err.message || "Failed to invite user");
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
            style={{ backgroundColor: 'hsl(39, 100%, 50%)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'hsl(39, 100%, 45%)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'hsl(39, 100%, 50%)'}
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
  const [editingUser, setEditingUser] = useState(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchRef = useRef(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!searchExpanded) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target) && !searchQuery) {
        setSearchExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchExpanded, searchQuery]);

  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ["client", organizationId],
    queryFn: async () => base44.entities.Client.get(organizationId),
    enabled: !!organizationId,
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["organizationUsers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return await base44.entities.ClientUser.filter({ client_id: organizationId }, "-created_date");
    },
    enabled: !!organizationId,
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ userId, clientRole, isActive }) => {
      const response = await base44.functions.invoke("updateClientMember", { userId, clientRole, isActive });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizationUsers", organizationId] });
      setEditingUser(null);
      setDeactivateConfirm(null);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err?.response?.data?.error || err.message || "Failed to update team member");
    },
  });

  const filteredUsers = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    return [...users]
      .filter((user) => {
        return (
          user.full_name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.role?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        let aVal = a[sortField] ?? "";
        let bVal = b[sortField] ?? "";

        if (sortField === "created_date") {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        } else if (sortField === "is_active") {
          aVal = a.status === "inactive" ? "inactive" : "active";
          bVal = b.status === "inactive" ? "inactive" : "active";
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [users, searchQuery, sortField, sortDirection]);

  const currentActiveUsers = useMemo(() => {
    return users.filter((user) => user.status !== "inactive").length;
  }, [users]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-400 inline ml-1" />;
    return sortDirection === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
  };

  const maxUsers = typeof organization?.max_users === "number" ? organization.max_users : null;
  const hasReachedUserLimit = maxUsers !== null && currentActiveUsers >= maxUsers;
  const columns = [
    { key: "full_name", label: "Name", width: 220, sortable: true },
    { key: "email", label: "Email", width: 280, sortable: true },
    { key: "role", label: "Role", width: 140, sortable: true },
    { key: "is_active", label: "Status", width: 140, sortable: true },
    { key: "created_date", label: "Joined", width: 140, sortable: true },
    { key: "actions", label: "Actions", width: 220, sortable: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full bg-white flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: "hsl(217, 91%, 93%)" }}>
            <Users className="w-4 h-4" style={{ color: "hsl(217, 91%, 45%)" }} />
          </div>
          <span className="text-base font-semibold text-slate-800">Team Members</span>
        </div>
        <Button
          onClick={() => setShowInviteDialog(true)}
          disabled={!organizationId || isLoadingUsers || hasReachedUserLimit}
          style={{ backgroundColor: "hsl(217, 91%, 60%)", color: "white" }}
          className="hover:opacity-90 h-8 text-xs px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Invite Member
        </Button>
      </div>

      <div className="border-t border-slate-200 flex-shrink-0" />

      <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-600">
          <span className="font-medium text-slate-700">Active Members</span>
          <span className="inline-flex items-center justify-center min-w-8 h-5 px-1.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
            {currentActiveUsers}/{maxUsers ?? "—"}
          </span>
        </div>

        <div ref={searchRef} className="flex items-center">
          {searchExpanded ? (
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="pl-8 pr-8 h-8 text-xs w-52 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSearchExpanded(true)}
              className={`flex items-center justify-center h-8 w-8 border rounded-lg transition-colors ${
                searchQuery
                  ? "border-blue-400 bg-blue-50 text-blue-600"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
              title="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="px-6 pb-3">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="border-t border-slate-200 flex-shrink-0" />

      <div className="flex-1 overflow-auto">
        {isLoadingOrg || isLoadingUsers ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-2 border-blue-100 rounded-full animate-spin" style={{ borderTopColor: "hsl(217, 91%, 60%)" }} />
          </div>
        ) : (
          <table className="text-xs w-full" style={{ tableLayout: "fixed", minWidth: 1060 }}>
            <colgroup>
              {columns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    className="text-left py-2.5 font-semibold text-slate-600 whitespace-nowrap select-none border-r border-slate-200 last:border-r-0"
                    style={index === 0 ? { position: "sticky", left: 0, zIndex: 20, background: "hsl(var(--muted))" } : {}}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="pl-3 pr-4 hover:text-slate-900 block truncate"
                      >
                        {column.label}<SortIcon field={column.key} />
                      </button>
                    ) : (
                      <span className="pl-3 pr-4 block truncate">{column.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>No members found</p>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                  <td
                    className="px-3 py-2 truncate border-r border-slate-100 bg-white group-hover:bg-slate-50"
                    style={{ position: "sticky", left: 0, zIndex: 1 }}
                  >
                    <div className="font-medium text-slate-900 truncate">{user.full_name || "—"}</div>
                  </td>
                  <td className="px-3 py-2 truncate border-r border-slate-100 text-slate-600">{user.email || "—"}</td>
                  <td className="px-3 py-2 border-r border-slate-100">
                    <Badge className={user.role === "admin" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"}>
                      {user.role || "member"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 border-r border-slate-100">
                    <Badge className={user.status === "inactive" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                      {user.status === "inactive" ? "Inactive" : "Active"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 truncate border-r border-slate-100 text-slate-500">
                    {user.created_date ? format(new Date(user.created_date), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeactivateConfirm(user)}
                        className={user.status === "inactive" ? "h-7 text-green-600 hover:text-green-700 hover:bg-green-50" : "h-7 text-red-600 hover:text-red-700 hover:bg-red-50"}
                      >
                        {user.status === "inactive" ? "Activate" : "Deactivate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InviteOrganizationUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        organizationId={organizationId}
        organizationName={organization?.name}
        currentUserCount={currentActiveUsers}
        maxUsers={maxUsers ?? Number.MAX_SAFE_INTEGER}
      />

      <MemberEditDialog
        member={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSave={({ clientRole, isActive }) =>
          updateMemberMutation.mutate({
            userId: editingUser.user_id,
            clientRole,
            isActive,
          })
        }
        isSaving={updateMemberMutation.isPending}
      />

      <AlertDialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateConfirm?.status === "inactive" ? "Activate User?" : "Deactivate User?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {deactivateConfirm?.status === "inactive" ? "activate" : "deactivate"} <strong>{deactivateConfirm?.full_name}</strong>?
              They will {deactivateConfirm?.status === "inactive" ? "be able to access this client" : "lose access to this client"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateMemberMutation.mutate({
                  userId: deactivateConfirm.id,
                  clientRole: deactivateConfirm.role,
                  isActive: deactivateConfirm.status === "inactive",
                })
              }
              className={deactivateConfirm?.status === "inactive" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {updateMemberMutation.isPending ? "Updating..." : (deactivateConfirm?.status === "inactive" ? "Activate" : "Deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}