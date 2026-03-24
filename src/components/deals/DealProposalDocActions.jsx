import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ExternalLink, FileText, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

const getStageMeta = (deal, lifecycleStages) => {
  const stageRecord = lifecycleStages.find((stage) => stage.id === deal.stage);
  const combined = `${deal.stage || ""} ${stageRecord?.name || ""}`.toLowerCase();
  return {
    isProposalStage: combined.includes("proposal"),
    isFinalStage: combined.includes("won") || combined.includes("lost"),
  };
};

const extractGoogleId = (value) => {
  const input = (value || "").trim();
  if (!input) return "";
  const directMatch = input.match(/[A-Za-z0-9_-]{20,}/);
  if (!input.startsWith("http://") && !input.startsWith("https://")) return directMatch?.[0] || "";

  try {
    const url = new URL(input);
    const pathMatch = url.pathname.match(/[A-Za-z0-9_-]{20,}/g);
    if (pathMatch?.length) return pathMatch[pathMatch.length - 1];
    return url.searchParams.get("id") || directMatch?.[0] || "";
  } catch {
    return directMatch?.[0] || "";
  }
};

const TAGS = [
  "{{deal_name}}",
  "{{organization_name}}",
  "{{deal_value}}",
  "{{contract_type}}",
  "{{stage_name}}",
  "{{start_date}}",
  "{{end_date}}",
  "{{expected_close_date}}",
  "{{services_summary}}",
  "{{deal_notes}}",
  "{{client_name}}",
];

export default function DealProposalDocActions({ deal, lifecycleStages = [], variant = "section", onUpdated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [templateValue, setTemplateValue] = useState("");
  const [folderValue, setFolderValue] = useState("");
  const [docUrl, setDocUrl] = useState(deal.proposal_doc_url || "");
  const [generatedAt, setGeneratedAt] = useState(deal.proposal_doc_generated_at || "");

  useEffect(() => {
    setDocUrl(deal.proposal_doc_url || "");
    setGeneratedAt(deal.proposal_doc_generated_at || "");
  }, [deal.id, deal.proposal_doc_generated_at, deal.proposal_doc_url]);

  const { isProposalStage, isFinalStage } = useMemo(
    () => getStageMeta(deal, lifecycleStages),
    [deal, lifecycleStages]
  );

  const { data: googleDriveConnection } = useQuery({
    queryKey: ["google-drive-connection", deal.id],
    enabled: isProposalStage || !!docUrl,
    queryFn: async () => {
      const records = await base44.entities.UserIntegration.filter({ integration_type: "google_drive", status: "connected" });
      return records[0] || null;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("startGoogleOAuth", {
        integrationType: "google_drive",
        appOrigin: window.location.origin,
        returnPath: `${window.location.pathname}${window.location.search}`,
      });
      window.location.href = response.data.authUrl;
      return response.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const templateDocId = extractGoogleId(templateValue);
      const destinationFolderId = extractGoogleId(folderValue);

      if (!templateDocId || !destinationFolderId) {
        throw new Error("Paste a valid Google Doc template link and Drive folder link.");
      }

      const response = await base44.functions.invoke("generateProposalDoc", {
        dealId: deal.id,
        templateDocId,
        destinationFolderId,
      });

      return response.data;
    },
    onSuccess: (data) => {
      setDocUrl(data.docUrl);
      setGeneratedAt(data.generatedAt);
      setIsOpen(false);
      toast.success(deal.proposal_doc_url ? "Proposal doc regenerated" : "Proposal doc created");
      onUpdated?.(data);
    },
    onError: (error) => {
      toast.error(error?.message || "Could not generate proposal doc");
    },
  });

  if (!isProposalStage && !docUrl) return null;

  const actionButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => setIsOpen(true)}
      disabled={!googleDriveConnection || generateMutation.isPending}
      className={variant === "section" ? "h-8 px-3 text-xs" : "h-6 px-2 text-[10px]"}
    >
      <FileText className="h-3.5 w-3.5" />
      {generateMutation.isPending ? "Generating..." : docUrl ? "Regenerate Doc" : "Generate Doc"}
    </Button>
  );

  return (
    <>
      {variant === "section" ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Proposal Google Doc</h3>
              <p className="mt-1 text-xs text-slate-500">Copy a Google Doc template, replace tags, and save it to a Drive folder you choose.</p>
              {generatedAt && (
                <p className="mt-1 text-[11px] text-slate-400">Last generated {moment(generatedAt).format("MMM D, YYYY h:mm A")}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {docUrl && (
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Doc
              </a>
            )}

            {!googleDriveConnection ? (
              <Button type="button" size="sm" variant="outline" onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending} className="h-8 px-3 text-xs">
                <LinkIcon className="h-3.5 w-3.5" />
                {connectMutation.isPending ? "Connecting..." : "Connect Google Drive"}
              </Button>
            ) : (
              !isFinalStage && actionButton
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {docUrl && (
            <a
              href={docUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <ExternalLink className="h-3 w-3" />
              Open Doc
            </a>
          )}
          {!googleDriveConnection ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                connectMutation.mutate();
              }}
              disabled={connectMutation.isPending}
              className="h-6 px-2 text-[10px]"
            >
              <LinkIcon className="h-3 w-3" />
              {connectMutation.isPending ? "Connecting..." : "Connect Drive"}
            </Button>
          ) : (
            !isFinalStage && (
              <div onClick={(event) => event.stopPropagation()}>{actionButton}</div>
            )
          )}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Proposal Google Doc</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Template Google Doc</label>
              <Input value={templateValue} onChange={(event) => setTemplateValue(event.target.value)} placeholder="Paste Google Doc link or ID" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Destination Drive Folder</label>
              <Input value={folderValue} onChange={(event) => setFolderValue(event.target.value)} placeholder="Paste Drive folder link or ID" />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">Supported template tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-600 border border-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? "Generating..." : "Generate Doc"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}