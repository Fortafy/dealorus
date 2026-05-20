import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AlertCircle, CheckCircle2, Loader } from "lucide-react";

export default function InviteUserDialog({ open, onOpenChange, clientId, onSuccess }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [selectedClientId, setSelectedClientId] = useState(clientId || "");
  const [currentUser, setCurrentUser] = useState(null);
  const [existingUserMatch, setExistingUserMatch] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      if (clientId) {
        setSelectedClientId(clientId);
      } else if (!selectedClientId && user?.client_id) {
        setSelectedClientId(user.client_id);
      }
    };
    fetchUser();
  }, [clientId]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
    enabled: currentUser?.role === "admin",
  });

  const isSystemAdmin = currentUser?.role === "admin";
  const isClientAdmin = currentUser?.client_role === "admin";

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) {
        throw new Error("Please select a client");
      }

      const response = await base44.functions.invoke("inviteClientMember", {
        email: email.trim().toLowerCase(),
        clientId: selectedClientId,
        clientRole: role,
      });

      return response.data;
    },
    onSuccess: () => {
      setSuccess(`Invitation sent to ${email}. Status set to invited.`);
      setEmail("");
      setRole("member");
      setExistingUserMatch(null);
      queryClient.invalidateQueries({ queryKey: ["client-users", selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ["organization-users", selectedClientId] });
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(null);
        onOpenChange(false);
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || "Failed to send invitation");
    },
  });

  const moveExistingUserMutation = useMutation({
    mutationFn: async () => {
      if (!existingUserMatch?.id) {
        throw new Error("No existing user selected.");
      }

      const response = await base44.functions.invoke("updateClientMember", {
        userId: existingUserMatch.id,
        clientId: selectedClientId,
        clientRole: role,
      });

      return response.data;
    },
    onSuccess: () => {
      setSuccess(`User moved to this client successfully.`);
      setEmail("");
      setRole("member");
      setExistingUserMatch(null);
      queryClient.invalidateQueries({ queryKey: ["client-users", selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ["organization-users", selectedClientId] });
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(null);
        onOpenChange(false);
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || "Failed to move user");
    },
  });

  const handleInvite = async () => {
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const matchedUsers = await base44.entities.User.filter({ email: normalizedEmail });

    if (matchedUsers.length > 0) {
      setExistingUserMatch(matchedUsers[0]);
      setError("A user with this email already exists.");
      return;
    }

    inviteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join {isSystemAdmin ? "a client organization" : "your organization"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Client Selection (System Admin Only - when not pre-set) */}
          {isSystemAdmin && !clientId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client
              </label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={inviteMutation.isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              disabled={inviteMutation.isPending}
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role
            </label>
            <Select value={role} onValueChange={setRole} disabled={inviteMutation.isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                {(isClientAdmin || isSystemAdmin) && <SelectItem value="admin">Client Administrator</SelectItem>}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-2">
              {role === "admin"
                ? "Client administrators can invite users and manage client settings"
                : "Members can view and manage data"}
            </p>
            {existingUserMatch && (
              <p className="text-xs text-amber-700 mt-2">
                {existingUserMatch.email} already exists. You can move this user to the selected client after confirmation.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={!!existingUserMatch} onOpenChange={() => setExistingUserMatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move existing user?</AlertDialogTitle>
            <AlertDialogDescription>
              This email already belongs to an existing user. Do you want to move <strong>{existingUserMatch?.email}</strong> to this client account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => moveExistingUserMutation.mutate()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {moveExistingUserMutation.isPending ? "Moving..." : "Confirm & Move"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}