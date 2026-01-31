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
import { AlertCircle, CheckCircle2, Loader } from "lucide-react";

export default function CreateOrganizationDialog({ open, onOpenChange, allUsers }) {
  const [formData, setFormData] = useState({
    name: "",
    admin_user_id: "",
    subscription_plan: "basic",
    subscription_status: "trial",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error("Client name is required");
      }
      if (!formData.admin_user_id) {
        throw new Error("Please select an administrator");
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Administrator
            </label>
            <Select
              value={formData.admin_user_id}
              onValueChange={(value) => handleChange("admin_user_id", value)}
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