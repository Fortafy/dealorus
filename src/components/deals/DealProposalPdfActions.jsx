import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import moment from "moment";
import { FileText, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formatDate = (value, format = "MMM D, YYYY") => value ? moment(value).format(format) : "—";
const formatMoney = (value) => value || value === 0 ? `$${Number(value).toLocaleString()}` : "—";
const formatContractType = (value) => {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const buildFileName = (name) => {
  const slug = (name || "deal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "deal";
  return `${slug}-proposal.pdf`;
};

const getStageMeta = (deal, lifecycleStages) => {
  const stageRecord = lifecycleStages.find((stage) => stage.id === deal.stage);
  const combined = `${deal.stage || ""} ${stageRecord?.name || ""}`.toLowerCase();
  return {
    label: stageRecord?.name || deal.stage || "—",
    isProposalStage: combined.includes("proposal"),
    isFinalStage: combined.includes("won") || combined.includes("lost"),
  };
};

const buildOrganizationAddress = (organization) => {
  if (!organization) return null;
  return [organization.address, organization.city, organization.state, organization.zip_code].filter(Boolean).join(", ");
};

const htmlToPdfText = (html) => {
  if (!html) return "";

  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href");
    const text = link.textContent?.trim();
    if (href && text && !text.includes(href)) {
      link.textContent = `${text} (${href})`;
    } else if (href && !text) {
      link.textContent = href;
    }
  });

  return (parsed.body.innerText || parsed.body.textContent || "").trim();
};

export default function DealProposalPdfActions({ deal, lifecycleStages = [], variant = "inline", onUpdated }) {
  const [pdfUrl, setPdfUrl] = useState(deal.proposal_pdf_url || "");
  const [generatedAt, setGeneratedAt] = useState(deal.proposal_pdf_generated_at || "");

  useEffect(() => {
    setPdfUrl(deal.proposal_pdf_url || "");
    setGeneratedAt(deal.proposal_pdf_generated_at || "");
  }, [deal.proposal_pdf_generated_at, deal.proposal_pdf_url, deal.id]);

  const displayDeal = useMemo(
    () => ({
      ...deal,
      proposal_pdf_url: pdfUrl,
      proposal_pdf_generated_at: generatedAt,
    }),
    [deal, pdfUrl, generatedAt]
  );

  const { label: stageLabel, isProposalStage, isFinalStage } = useMemo(
    () => getStageMeta(displayDeal, lifecycleStages),
    [displayDeal, lifecycleStages]
  );

  const { data: organization } = useQuery({
    queryKey: ["deal-proposal-organization", displayDeal.organization_id],
    enabled: !!displayDeal.organization_id && (isProposalStage || !!displayDeal.proposal_pdf_url),
    queryFn: async () => {
      const results = await base44.entities.Organization.filter({ id: displayDeal.organization_id });
      return results[0] || null;
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      const generatedTimestamp = new Date().toISOString();
      let y = 18;

      const ensureSpace = (needed = 10) => {
        if (y + needed <= pageHeight - 16) return;
        doc.addPage();
        y = 18;
      };

      const addTitle = (text) => {
        ensureSpace(14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(text, margin, y);
        y += 8;
      };

      const addSectionTitle = (text) => {
        ensureSpace(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(text, margin, y);
        y += 6;
      };

      const addBodyText = (text) => {
        if (!text) return;
        const lines = doc.splitTextToSize(String(text), contentWidth);
        ensureSpace(lines.length * 5 + 2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 2;
      };

      const addKeyValue = (label, value) => {
        if (!value || value === "—") return;
        const text = `${label}: ${value}`;
        const lines = doc.splitTextToSize(text, contentWidth);
        ensureSpace(lines.length * 5 + 1);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 1;
      };

      addTitle("Deal Proposal Summary");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated ${moment(generatedTimestamp).format("MMM D, YYYY h:mm A")}`, margin, y);
      y += 8;

      addSectionTitle("Deal Overview");
      addKeyValue("Deal Name", displayDeal.name);
      addKeyValue("Organization", displayDeal.organization_name || organization?.organization_name || "—");
      addKeyValue("Stage", stageLabel);
      addKeyValue("Contract Type", formatContractType(displayDeal.contract_type));
      addKeyValue("Value", formatMoney(displayDeal.value));
      addKeyValue("Probability", displayDeal.probability || displayDeal.probability === 0 ? `${displayDeal.probability}%` : "—");
      addKeyValue("Start Date", formatDate(displayDeal.start_date));
      addKeyValue("End Date", formatDate(displayDeal.end_date));
      addKeyValue("Expected Close Date", formatDate(displayDeal.expected_close_date));
      addKeyValue("Reminder Date", displayDeal.remind_at ? formatDate(displayDeal.remind_at, "MMM D, YYYY h:mm A") : "—");

      if (organization) {
        addSectionTitle("Organization Details");
        addKeyValue("Address", buildOrganizationAddress(organization));
        addKeyValue("Website", organization.website || "—");
        addKeyValue("Phone", organization.phone || "—");
        addKeyValue("Email", organization.email || "—");
        addKeyValue("State", organization.state || "—");
      }

      addSectionTitle("Notes");
      addBodyText(htmlToPdfText(displayDeal.description) || "No notes added.");

      addSectionTitle("Services");
      if (displayDeal.services?.length) {
        displayDeal.services.forEach((service, index) => {
          addKeyValue(`Service ${index + 1}`, service.service_name || "—");
          addKeyValue("Hourly Rate", formatMoney(service.rate));
          addKeyValue("Hours / Month", service.hours_per_month || service.hours_per_month === 0 ? String(service.hours_per_month) : "—");
          addKeyValue("Total Estimated Hours", service.total_estimated_hours || service.total_estimated_hours === 0 ? String(service.total_estimated_hours) : "—");
          addKeyValue("Overage Rate", formatMoney(service.overage_rate));
          y += 2;
        });
      } else {
        addBodyText("No services added.");
      }

      const pdfBlob = doc.output("blob");
      const file = new File([pdfBlob], buildFileName(displayDeal.name), { type: "application/pdf" });
      const uploadResult = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Deal.update(displayDeal.id, {
        proposal_pdf_url: uploadResult.file_url,
        proposal_pdf_generated_at: generatedTimestamp,
      });

      return {
        fileUrl: uploadResult.file_url,
        generatedTimestamp,
      };
    },
    onSuccess: ({ fileUrl, generatedTimestamp }) => {
      setPdfUrl(fileUrl);
      setGeneratedAt(generatedTimestamp);
      toast.success(displayDeal.proposal_pdf_url ? "Proposal PDF regenerated" : "Proposal PDF generated");
      onUpdated?.({ fileUrl, generatedTimestamp });
    },
  });

  if (!isProposalStage && !displayDeal.proposal_pdf_url) {
    return null;
  }

  if (variant === "section") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Proposal PDF</h3>
            <p className="mt-1 text-xs text-slate-500">
              Generate and keep the latest proposal PDF attached to this deal.
            </p>
            {displayDeal.proposal_pdf_generated_at && (
              <p className="mt-1 text-[11px] text-slate-400">
                Last generated {moment(displayDeal.proposal_pdf_generated_at).format("MMM D, YYYY h:mm A")}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {displayDeal.proposal_pdf_url && (
            <a
              href={displayDeal.proposal_pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View PDF
            </a>
          )}

          {isProposalStage && !isFinalStage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => generatePdfMutation.mutate()}
              disabled={generatePdfMutation.isPending}
              className="h-8 px-3 text-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              {generatePdfMutation.isPending ? "Generating..." : displayDeal.proposal_pdf_url ? "Regenerate PDF" : "Generate PDF"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {displayDeal.proposal_pdf_url && (
        <a
          href={displayDeal.proposal_pdf_url}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <ExternalLink className="h-3 w-3" />
          View PDF
        </a>
      )}

      {isProposalStage && !isFinalStage && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            generatePdfMutation.mutate();
          }}
          disabled={generatePdfMutation.isPending}
          className="h-6 px-2 text-[10px]"
        >
          <FileText className="h-3 w-3" />
          {generatePdfMutation.isPending ? "Generating..." : displayDeal.proposal_pdf_url ? "Regenerate PDF" : "Generate PDF"}
        </Button>
      )}
    </div>
  );
}