import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { AlertCircle, CheckCircle2, Loader, Plus } from "lucide-react";

export default function CreateOrganizationDialog({ open, onOpenChange, allUsers = [] }) {
  const [formData, setFormData] = useState({
    name: "",
    admin_user_id: "",
    subscription_plan: "basic",
    subscription_status: "trial",
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    full_name: "",
    email: "",
  });
  const [pendingInviteEmail, setPendingInviteEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const email = newUserData.email.trim().toLowerCase();
      const fullName = newUserData.full_name.trim();

      if (!email || !fullName) {
        throw new Error("Email and full name are required");
      }

      await base44.users.inviteUser(email, "admin");
      return { email, fullName };
    },
    onSuccess: ({ email, fullName }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      setPendingInviteEmail(email);
      setShowUserForm(false);
      setNewUserData({ full_name: "", email: "" });
      setError(null);
      setSuccess(`Invitation sent to ${fullName}. They will appear as an administrator after accepting the invite.`);
    },
    onError: (err) => {
      setError(err.message || "Failed to create user");
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error("Client name is required");
      }
      if (!formData.admin_user_id) {
        throw new Error(
          pendingInviteEmail
            ? "The invited user must accept their email invitation before they can be assigned as administrator."
            : "Please select an administrator"
        );
      }
      return await base44.entities.Client.create(formData);
    },
    onSuccess: () => {
      setSuccess("Client created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setTimeout(() => {
        onOpenChange(false);
        setFormData({
          name: "",
          admin_user_id: "",
          subscription_plan: "basic",
          subscription_status: "trial",
        });
        setPendingInviteEmail("");
        setSuccess(null);
      }, 1500);
    },
    onError: (err) => {
      setError(err.message || "Failed to create client");
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Client</DialogTitle>
          <DialogDescription>
            Create a new client organization and assign an administrator
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

          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Client Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Client name"
              disabled={createMutation.isPending}
            />
          </div>

          {/* Administrator */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Administrator
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowUserForm(!showUserForm)}
                disabled={createMutation.isPending || createUserMutation.isPending}
                className="h-7 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3 h-3 mr-1" />
                New User
              </Button>
            </div>
            
            {showUserForm ? (
              <div className="space-y-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                <Input
                  value={newUserData.full_name}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Full name"
                  disabled={createUserMutation.isPending}
                />
                <Input
                  value={newUserData.email}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email address"
                  type="email"
                  disabled={createUserMutation.isPending}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => createUserMutation.mutate()}
                    disabled={createUserMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <Loader className="w-3 h-3 mr-1 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create & Select"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowUserForm(false);
                      setNewUserData({ full_name: "", email: "" });
                    }}
                    disabled={createUserMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Select
                  value={formData.admin_user_id}
                  onValueChange={(value) => {
                    setPendingInviteEmail("");
                    handleChange("admin_user_id", value);
                  }}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select administrator" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pendingInviteEmail && (
                  <p className="text-xs text-amber-700">
                    Invitation sent to {pendingInviteEmail}. Once they accept, reopen this form and select them as administrator.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Plan
            </label>
            <Select
              value={formData.subscription_plan}
              onValueChange={(value) => handleChange("subscription_plan", value)}
              disabled={createMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscription Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <Select
              value={formData.subscription_status}
              onValueChange={(value) => handleChange("subscription_status", value)}
              disabled={createMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}