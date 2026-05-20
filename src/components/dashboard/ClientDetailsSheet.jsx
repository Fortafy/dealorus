import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Upload,
  FileText,
  Activity,
  Save,
  Loader,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  UserPlus,
  Copy,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import moment from "moment";
import InviteUserDialog from "../organizations/InviteUserDialog";

export default function ClientDetailsSheet({ client, open, onOpenChange, allUsers }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(client || {});
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newCustomField, setNewCustomField] = useState({ key: "", value: "" });
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery({
    queryKey: ["client-activities", client?.id],
    enabled: !!client?.id && open,
    queryFn: () => base44.entities.ClientActivity.filter({ client_id: client.id }, "-created_date", 50),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["client-documents", client?.id],
    enabled: !!client?.id && open,
    queryFn: () => base44.entities.ClientDocument.filter({ client_id: client.id }, "-created_date"),
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ["client-users", client?.id, open],
    enabled: !!client?.id && open,
    queryFn: async () => {
      return await base44.entities.ClientUser.filter({ client_id: client.id }, "-created_date");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Client.update(client.id, data);
      await base44.entities.ClientActivity.create({
        client_id: client.id,
        action_type: "updated",
        description: "Client details updated",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["client-activities", client.id] });
      setSuccess("Client updated successfully");
      setEditMode(false);
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => setError(err.message || "Failed to update client"),
  });

  const uploadDocMutation = useMutation({
    mutationFn: async ({ file, category, notes }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ClientDocument.create({
        client_id: client.id,
        name: file.name,
        file_url,
        file_type: file.type,
        file_size: file.size,
        category,
        notes,
      });
      await base44.entities.ClientActivity.create({
        client_id: client.id,
        action_type: "document_uploaded",
        description: `Document "${file.name}" uploaded`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-documents", client.id] });
      queryClient.invalidateQueries({ queryKey: ["client-activities", client.id] });
      setUploadingDoc(false);
    },
    onError: (err) => setError(err.message || "Failed to upload document"),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId) => {
      await base44.entities.ClientDocument.delete(docId);
      await base44.entities.ClientActivity.create({
        client_id: client.id,
        action_type: "document_uploaded",
        description: "Document deleted",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-documents", client.id] });
      queryClient.invalidateQueries({ queryKey: ["client-activities", client.id] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadDocMutation.mutate({ file, category: "other", notes: "" });
  };

  const addCustomField = () => {
    if (!newCustomField.key.trim()) return;
    const custom = formData.custom_fields || {};
    custom[newCustomField.key] = newCustomField.value;
    setFormData({ ...formData, custom_fields: custom });
    setNewCustomField({ key: "", value: "" });
  };

  const removeCustomField = (key) => {
    const custom = { ...formData.custom_fields };
    delete custom[key];
    setFormData({ ...formData, custom_fields: custom });
  };

  const getUserName = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    return user?.full_name || "Unknown User";
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(client.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  React.useEffect(() => {
    if (client) setFormData(client);
  }, [client]);

  useEffect(() => {
    if (open && client?.id) {
      queryClient.removeQueries({ queryKey: ["client-users"] });
      refetchUsers();
    }
  }, [open, client?.id, queryClient, refetchUsers]);

  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {client.name}
          </SheetTitle>
          <SheetDescription>
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors group"
            >
              <span>Client Id: {client.id}</span>
              {copiedId ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </SheetDescription>
        </SheetHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="documents">Docs ({documents.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <InviteUserDialog
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
            clientId={client.id}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["client-users"] });
              queryClient.invalidateQueries({ queryKey: ["client-activities", client.id] });
              refetchUsers();
            }}
          />

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="flex justify-end mb-2">
              {editMode ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditMode(false);
                      setFormData(client);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate(formData)}
                    disabled={updateMutation.isPending}
                    className="bg-blue-600"
                  >
                    {updateMutation.isPending ? (
                      <><Loader className="w-3 h-3 mr-1 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-3 h-3 mr-1" /> Save</>
                    )}
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => setEditMode(true)}>
                  Edit Details
                </Button>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Name</label>
                  {editMode ? (
                    <Input
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{client.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Category</label>
                  {editMode ? (
                    <Select
                      value={formData.category || ""}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                        <SelectItem value="mid-market">Mid-Market</SelectItem>
                        <SelectItem value="small-business">Small Business</SelectItem>
                        <SelectItem value="startup">Startup</SelectItem>
                        <SelectItem value="non-profit">Non-Profit</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="mt-1 capitalize">
                      {client.category || "Not set"}
                    </Badge>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Industry</label>
                  {editMode ? (
                    <Input
                      value={formData.industry || ""}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{client.industry || "Not specified"}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Company Size</label>
                  {editMode ? (
                    <Select
                      value={formData.company_size || ""}
                      onValueChange={(value) => setFormData({ ...formData, company_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501+">501+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{client.company_size || "Not specified"}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Website</label>
                  {editMode ? (
                    <Input
                      value={formData.website || ""}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{client.website || "Not specified"}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Phone</label>
                  {editMode ? (
                    <Input
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{client.phone || "Not specified"}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Account Manager</label>
                  {editMode ? (
                    <Input
                      value={formData.account_manager || ""}
                      onChange={(e) => setFormData({ ...formData, account_manager: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{client.account_manager || "Not assigned"}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Street Address</label>
                  {editMode ? (
                    <Input
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{client.address || "Not specified"}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">City</label>
                    {editMode ? (
                      <Input
                        value={formData.city || ""}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm">{client.city || "—"}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">State</label>
                    {editMode ? (
                      <Input
                        value={formData.state || ""}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm">{client.state || "—"}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Zip Code</label>
                    {editMode ? (
                      <Input
                        value={formData.zip_code || ""}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm">{client.zip_code || "—"}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Country</label>
                    {editMode ? (
                      <Input
                        value={formData.country || ""}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm">{client.country || "USA"}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <Textarea
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Internal notes about this client..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-slate-600">{client.notes || "No notes"}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  Custom Fields
                  {editMode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={addCustomField}
                      className="h-7"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Field
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editMode && (
                  <div className="flex gap-2 mb-3 p-2 border border-slate-200 rounded">
                    <Input
                      placeholder="Field name"
                      value={newCustomField.key}
                      onChange={(e) => setNewCustomField({ ...newCustomField, key: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={newCustomField.value}
                      onChange={(e) => setNewCustomField({ ...newCustomField, value: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                )}
                {formData.custom_fields && Object.keys(formData.custom_fields).length > 0 ? (
                  Object.entries(formData.custom_fields).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div>
                        <p className="text-xs font-medium text-slate-600">{key}</p>
                        <p className="text-sm">{value}</p>
                      </div>
                      {editMode && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCustomField(key)}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No custom fields</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Button 
                size="sm" 
                onClick={() => setShowInviteDialog(true)}
                className="bg-blue-600"
              >
                <UserPlus className="w-3 h-3 mr-2" />
                Invite User
              </Button>
            </div>

            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{user.full_name || user.email}</p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">
                          {user.client_role || user.role}
                        </Badge>
                        {user.status === "pending" && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Invited
                          </Badge>
                        )}
                        {user.status === "active" && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Active
                          </Badge>
                        )}
                        {user.status === "inactive" && (
                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {users.length === 0 && (
              <p className="text-center text-slate-400 py-8">No users assigned</p>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <label htmlFor="doc-upload">
                <Button size="sm" className="cursor-pointer" asChild>
                  <span>
                    <Upload className="w-3 h-3 mr-2" />
                    Upload Document
                  </span>
                </Button>
              </label>
              <input
                id="doc-upload"
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {uploadDocMutation.isPending && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4 flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-800">Uploading document...</span>
                </CardContent>
              </Card>
            )}

            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 mt-1 text-slate-400" />
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-slate-500">
                          {moment(doc.created_date).format("MMM D, YYYY")} • {(doc.file_size / 1024).toFixed(1)} KB
                        </p>
                        <Badge variant="outline" className="mt-1 capitalize text-xs">
                          {doc.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(doc.file_url, "_blank")}
                        className="h-7 w-7 p-0"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteDocMutation.mutate(doc.id)}
                        className="h-7 w-7 p-0 text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {documents.length === 0 && !uploadDocMutation.isPending && (
              <p className="text-center text-slate-400 py-8">No documents uploaded</p>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-3 mt-4">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Activity className="w-4 h-4 mt-1 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {moment(activity.created_date).format("MMM D, YYYY h:mm A")}
                          {activity.user_id && ` • ${getUserName(activity.user_id)}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {activities.length === 0 && (
              <p className="text-center text-slate-400 py-8">No activity yet</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}