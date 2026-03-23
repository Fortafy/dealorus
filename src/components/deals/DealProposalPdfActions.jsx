import React from "react";
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

export default function DealProposalPdfActions({ deal, lifecycleStages = [], onUpdated }) {
  const { label: stageLabel, isProposalStage, isFinalStage } = React.useMemo(
    () => getStageMeta(deal, lifecycleStages),
    [deal, lifecycleStages]
  );

  const { data: organization } = useQuery({
    queryKey: ["deal-proposal-organization", deal.organization_id],
    enabled: !!deal.organization_id && (isProposalStage || !!deal.proposal_pdf_url),
    queryFn: async () => {
      const results = await base44.entities.Organization.filter({ id: deal.organization_id });
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
      doc.text(`Generated ${moment().format("MMM D, YYYY h:mm A")}`, margin, y);
      y += 8;

      addSectionTitle("Deal Overview");
      addKeyValue("Deal Name", deal.name);
      addKeyValue("Organization", deal.organization_name || organization?.organization_name || "—");
      addKeyValue("Stage", stageLabel);
      addKeyValue("Contract Type", formatContractType(deal.contract_type));
      addKeyValue("Value", formatMoney(deal.value));
      addKeyValue("Probability", deal.probability || deal.probability === 0 ? `${deal.probability}%` : "—");
      addKeyValue("Start Date", formatDate(deal.start_date));
      addKeyValue("End Date", formatDate(deal.end_date));
      addKeyValue("Expected Close Date", formatDate(deal.expected_close_date));
      addKeyValue("Reminder Date", deal.remind_at ? formatDate(deal.remind_at, "MMM D, YYYY h:mm A") : "—");

      if (organization) {
        addSectionTitle("Organization Details");
        addKeyValue("Address", buildOrganizationAddress(organization));
        addKeyValue("Website", organization.website || "—");
        addKeyValue("Phone", organization.phone || "—");
        addKeyValue("Email", organization.email || "—");
        addKeyValue("State", organization.state || "—");
      }

      addSectionTitle("Notes");
      addBodyText(deal.description || "No notes added.");

      addSectionTitle("Services");
      if (deal.services?.length) {
        deal.services.forEach((service, index) => {
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
      const file = new File([pdfBlob], buildFileName(deal.name), { type: "application/pdf" });
      const uploadResult = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Deal.update(deal.id, {
        proposal_pdf_url: uploadResult.file_url,
        proposal_pdf_generated_at: new Date().toISOString(),
      });

      return uploadResult.file_url;
    },
    onSuccess: () => {
      toast.success(deal.proposal_pdf_url ? "Proposal PDF regenerated" : "Proposal PDF generated");
      onUpdated?.();
    },
  });

  if (!isProposalStage && !deal.proposal_pdf_url) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {deal.proposal_pdf_url && (
        <a
          href={deal.proposal_pdf_url}
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
          {generatePdfMutation.isPending ? "Generating..." : deal.proposal_pdf_url ? "Regenerate PDF" : "Generate PDF"}
        </Button>
      )}
    </div>
  );
}