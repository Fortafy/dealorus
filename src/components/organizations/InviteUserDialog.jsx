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
import { AlertCircle, Loader } from "lucide-react";

export default function InviteUserDialog({ open, onOpenChange, clientId, onSuccess }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [selectedClientId, setSelectedClientId] = useState(clientId || "");
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      if (clientId) {
        setSelectedClientId(clientId);
      } else if (!selectedClientId && (user?.active_client_id || user?.data?.active_client_id)) {
        setSelectedClientId(user.active_client_id || user?.data?.active_client_id);
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
  const isClientAdmin = true;

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) {
        throw new Error("Please select a client");
      }

      const response = await base44.functions.invoke("inviteClientMember", {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        clientId: selectedClientId,
        clientRole: role,
      });

      return response.data;
    },
    onSuccess: () => {
      setFullName("");
      setEmail("");
      setRole("member");
      queryClient.invalidateQueries({ queryKey: ["client-users", selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ["organization-users", selectedClientId] });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || err.message || "Failed to send invitation");
    },
  });

  const handleInvite = async () => {
    if (!fullName.trim()) {
      setError("Please enter a full name");
      return;
    }

    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setError(null);
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <Input
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setError(null);
              }}
              disabled={inviteMutation.isPending}
            />
          </div>

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

    </Dialog>
  );
}