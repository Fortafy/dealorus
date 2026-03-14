import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function DealsSection({ organization, clientId, clientLifecycleStages = [], isCollapsed }) {
  const queryClient = useQueryClient();
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealName, setDealName] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("");
  const [dealDescription, setDealDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", organization.id],
    queryFn: () => base44.entities.Deal.filter({ organization_id: organization.id }, "-created_date"),
  });

  const createDealMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Deal.create({
        ...data,
        client_id: clientId,
        organization_id: organization.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal created");
      setDealName("");
      setDealValue("");
      setDealStage("");
      setDealDescription("");
      setShowDealForm(false);
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: (id) => base44.entities.Deal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", organization.id] });
      toast.success("Deal deleted");
    },
  });

  const handleSubmit = async () => {
    if (!dealName.trim() || !dealStage.trim()) {
      toast.error("Please fill in deal name and stage");
      return;
    }

    setIsSubmitting(true);
    createDealMutation.mutate({
      name: dealName,
      value: dealValue ? parseFloat(dealValue) : null,
      stage: dealStage,
      description: dealDescription,
    });
    setIsSubmitting(false);
  };

  if (isCollapsed) return null;

  const getStageLabel = (stageId) => {
    return clientLifecycleStages.find((s) => s.id === stageId)?.name || stageId;
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Deals ({deals.length})
          </CardTitle>
          {!showDealForm && (
            <Button
              size="sm"
              onClick={() => setShowDealForm(true)}
              style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
              className="text-white hover:opacity-90 h-7 px-2"
            >
              <Plus className="w-3 h-3 mr-1" />
              New Deal
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {showDealForm && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <Input
              placeholder="Deal name..."
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Deal value ($)"
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              className="text-sm"
            />
            <select
              value={dealStage}
              onChange={(e) => setDealStage(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
            >
              <option value="">Select stage...</option>
              {clientLifecycleStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <Textarea
              placeholder="Deal description..."
              value={dealDescription}
              onChange={(e) => setDealDescription(e.target.value)}
              className="text-sm h-20"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
                className="text-white hover:opacity-90"
              >
                Save Deal
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDealForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {deals.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No deals yet</p>
        ) : (
          <div className="space-y-2">
            {deals.map((deal) => (
              <div key={deal.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-900">{deal.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{moment(deal.created_date).format("MMM D, YYYY")}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDealMutation.mutate(deal.id)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {deal.value && (
                    <Badge variant="outline" className="text-xs">
                      ${deal.value.toLocaleString()}
                    </Badge>
                  )}
                  <Badge className="text-xs" style={{ backgroundColor: "hsl(214, 95%, 93%)", color: "hsl(217, 91%, 60%)" }}>
                    {getStageLabel(deal.stage)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}