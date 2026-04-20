import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import moment from "moment";
import { FileText, ExternalLink, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import ProposalPdfEmailDialog from "@/components/deals/ProposalPdfEmailDialog";
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
  return `${slug}-sales-order.pdf`;
};

const getServiceQuantity = (service, contractType) => {
  const value = contractType === "project" ? service.total_estimated_hours : service.hours_per_month;
  return value || value === 0 ? Number(value) : null;
};

const getServiceLineTotal = (service, contractType) => {
  const quantity = getServiceQuantity(service, contractType);
  const rate = service.rate || service.rate === 0 ? Number(service.rate) : null;
  if (quantity === null || rate === null) return null;
  return quantity * rate;
};

const hexToRgb = (hex) => {
  if (!hex) return [49, 46, 129];
  const normalized = hex.replace("#", "").trim();
  const safeHex = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(safeHex)) return [49, 46, 129];

  return [
    parseInt(safeHex.slice(0, 2), 16),
    parseInt(safeHex.slice(2, 4), 16),
    parseInt(safeHex.slice(4, 6), 16),
  ];
};

const loadImageData = async (url) => {
  if (!url) return null;

  const response = await fetch(url);
  const blob = await response.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  return {
    dataUrl,
    width: image.width,
    height: image.height,
    format: blob.type === "image/png" ? "PNG" : "JPEG",
  };
};

const renderRichTextHtml = async (doc, html, x, y, width, pageHeight, margin) => {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "700px";
  container.style.padding = "0";
  container.style.background = "#ffffff";
  container.innerHTML = `
    <style>
      .pdf-rich-text { color: #334155; font-family: Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.55; }
      .pdf-rich-text h1, .pdf-rich-text h2, .pdf-rich-text h3 { color: #0f172a; margin: 0 0 8px; font-weight: 700; }
      .pdf-rich-text h1 { font-size: 22px; }
      .pdf-rich-text h2 { font-size: 18px; }
      .pdf-rich-text h3 { font-size: 15px; }
      .pdf-rich-text p { margin: 0 0 8px; }
      .pdf-rich-text ul, .pdf-rich-text ol { margin: 0 0 8px 18px; padding: 0; }
      .pdf-rich-text li { margin: 0 0 4px; }
      .pdf-rich-text strong { font-weight: 700; }
      .pdf-rich-text em { font-style: italic; }
      .pdf-rich-text u { text-decoration: underline; }
      .pdf-rich-text a { color: #312e81; text-decoration: underline; }
      .pdf-rich-text blockquote { margin: 0 0 8px; padding-left: 10px; border-left: 3px solid #cbd5e1; color: #475569; }
    </style>
    <div class="pdf-rich-text">${html || "<p>No notes added.</p>"}</div>
  `;

  document.body.appendChild(container);
  const content = container.querySelector(".pdf-rich-text");
  const canvas = await html2canvas(content, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
  });
  document.body.removeChild(container);

  const mmPerPx = width / canvas.width;
  let offsetPx = 0;
  let currentY = y;
  let lastSliceHeightMm = 0;

  while (offsetPx < canvas.height) {
    const availableHeightMm = pageHeight - currentY - margin;
    const sliceHeightPx = Math.min(Math.floor(availableHeightMm / mmPerPx), canvas.height - offsetPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const sliceContext = sliceCanvas.getContext("2d");
    sliceContext.drawImage(canvas, 0, offsetPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    lastSliceHeightMm = sliceHeightPx * mmPerPx;
    doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", x, currentY, width, lastSliceHeightMm);
    offsetPx += sliceHeightPx;

    if (offsetPx < canvas.height) {
      doc.addPage();
      currentY = margin;
    }
  }

  return currentY + lastSliceHeightMm;
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
  const queryClient = useQueryClient();
  const [pdfUrl, setPdfUrl] = useState(deal.proposal_pdf_url || "");
  const [generatedAt, setGeneratedAt] = useState(deal.proposal_pdf_generated_at || "");
  const [lastStablePdfUrl, setLastStablePdfUrl] = useState(deal.proposal_pdf_url || "");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  useEffect(() => {
    setPdfUrl(deal.proposal_pdf_url || "");
    setGeneratedAt(deal.proposal_pdf_generated_at || "");
    if (deal.proposal_pdf_url) {
      setLastStablePdfUrl(deal.proposal_pdf_url);
    }
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

  const { data: client } = useQuery({
    queryKey: ["deal-proposal-client", displayDeal.client_id],
    enabled: !!displayDeal.client_id && (isProposalStage || !!displayDeal.proposal_pdf_url),
    queryFn: async () => {
      const results = await base44.entities.Client.filter({ id: displayDeal.client_id });
      return results[0] || null;
    },
  });

  const { data: proposalContacts = [] } = useQuery({
    queryKey: ["deal-proposal-contacts", displayDeal.organization_id],
    enabled: !!displayDeal.organization_id && (isProposalStage || !!displayDeal.proposal_pdf_url),
    queryFn: () => base44.entities.Contact.filter({ organization_id: displayDeal.organization_id }, "name"),
    initialData: [],
  });

  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      const generatedTimestamp = new Date().toISOString();
      const orderNumber = `SO-${(displayDeal.id || "DEAL").slice(0, 8).toUpperCase()}`;
      const quantityLabel = displayDeal.contract_type === "project" ? "Hours" : "Hours/Mo";
      const [headerR, headerG, headerB] = hexToRgb(client?.primary_color);
      const logo = client?.logo_url ? await loadImageData(client.logo_url).catch(() => null) : null;
      const administrativeContact = proposalContacts.find((contact) => contact.id === displayDeal.administrative_contact_id) || null;
      const billingContact = proposalContacts.find((contact) => contact.id === displayDeal.billing_contact_id) || null;
      let y = 18;

      const footerHeight = 12.7;
      const ensureSpace = (needed = 10) => {
        if (y + needed <= pageHeight - margin - footerHeight) return;
        doc.addPage();
        y = 18;
      };

      const addSectionTitle = (text) => {
        ensureSpace(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(text, margin, y);
        y += 6;
      };

      const addMutedLine = (label, value, x, lineY) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(label, x, lineY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(String(value || "—"), x, lineY + 4.5);
      };

      const addInfoRow = (label, value) => {
        if (!value || value === "—") return;
        const text = `${label}: ${value}`;
        const lines = doc.splitTextToSize(text, contentWidth);
        ensureSpace(lines.length * 5 + 1);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 1;
      };

      const buildContactDetails = (roleLabel, contact) => {
        if (!contact && !roleLabel) return [];
        const lines = [];
        if (roleLabel) lines.push(roleLabel);
        if (contact?.name) lines.push(contact.name);
        if (contact?.title) lines.push(contact.title);
        if (contact?.email) lines.push(contact.email);
        if (contact?.phone) lines.push(contact.phone);
        return lines;
      };

      doc.setFillColor(headerR, headerG, headerB);
      doc.roundedRect(margin, y, contentWidth, 20, 3, 3, "F");

      let headerTextX = margin + 6;
      if (logo) {
        const maxLogoWidth = 26;
        const maxLogoHeight = 12;
        const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
        const logoWidth = logo.width * scale;
        const logoHeight = logo.height * scale;
        doc.addImage(logo.dataUrl, logo.format, margin + 6, y + (20 - logoHeight) / 2, logoWidth, logoHeight);
        headerTextX = margin + 6 + maxLogoWidth + 4;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("Sales Order", headerTextX, y + 8.5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated ${moment(generatedTimestamp).format("MMM D, YYYY h:mm A")}`, headerTextX, y + 15);
      doc.setFont("helvetica", "bold");
      doc.text(orderNumber, pageWidth - margin - 6, y + 8.5, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Order Date ${moment(generatedTimestamp).format("MMM D, YYYY")}`, pageWidth - margin - 6, y + 15, { align: "right" });
      y += 28;

      const leftBoxWidth = 108;
      const rightBoxWidth = contentWidth - leftBoxWidth - 6;
      const billToLines = [
        displayDeal.organization_name || organization?.organization_name || "—",
        buildOrganizationAddress(organization),
        organization?.email,
        organization?.phone,
      ].filter(Boolean);
      const adminLines = buildContactDetails("Administrative Contact", administrativeContact);
      const billingLines = buildContactDetails("Billing Contact", billingContact);
      const orderDetailRows = [
        ["Deal Name", displayDeal.name || "—"],
        ["Contract Type", formatContractType(displayDeal.contract_type)],
        ["Start Date", formatDate(displayDeal.start_date)],
        ["End Date", formatDate(displayDeal.end_date)],
        ["Order Total", formatMoney(displayDeal.value || 0)],
      ];
      const leftBoxLines = Math.max(5, billToLines.length + adminLines.length + billingLines.length + (adminLines.length ? 1 : 0) + (billingLines.length ? 1 : 0));
      const rightBoxLines = 2 + orderDetailRows.length * 3;
      const boxHeight = Math.max(30, Math.max(leftBoxLines, rightBoxLines) * 4 + 12);
      ensureSpace(boxHeight + 4);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, leftBoxWidth, boxHeight, 2, 2);
      doc.roundedRect(margin + leftBoxWidth + 6, y, rightBoxWidth, boxHeight, 2, 2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Bill To", margin + 4, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      let leftTextY = y + 11;
      doc.text(doc.splitTextToSize(billToLines.join("\n"), leftBoxWidth - 8), margin + 4, leftTextY);
      leftTextY += billToLines.length * 4 + 2;
      if (adminLines.length) {
        doc.setFont("helvetica", "bold");
        doc.text(adminLines[0], margin + 4, leftTextY);
        leftTextY += 4;
        doc.setFont("helvetica", "normal");
        doc.text(doc.splitTextToSize(adminLines.slice(1).join("\n"), leftBoxWidth - 8), margin + 4, leftTextY);
        leftTextY += Math.max(0, adminLines.slice(1).length * 4 + 2);
      }
      if (billingLines.length) {
        doc.setFont("helvetica", "bold");
        doc.text(billingLines[0], margin + 4, leftTextY);
        leftTextY += 4;
        doc.setFont("helvetica", "normal");
        doc.text(doc.splitTextToSize(billingLines.slice(1).join("\n"), leftBoxWidth - 8), margin + 4, leftTextY);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Order Details", margin + leftBoxWidth + 10, y + 6);
      let rightTextY = y + 11;
      orderDetailRows.forEach(([label, value]) => {
        addMutedLine(label, value, margin + leftBoxWidth + 10, rightTextY);
        rightTextY += 10;
      });
      y += boxHeight + 2;
      addSectionTitle("Line Items");
      ensureSpace(14);
      const columns = [
        { label: "Service", x: margin + 3, width: 90 },
        { label: quantityLabel, x: margin + 96, width: 20 },
        { label: "Rate", x: margin + 120, width: 24 },
        { label: "Line Total", x: margin + 148, width: 27 },
      ];

      let computedTotal = 0;

      const drawLineItemsHeader = () => {
        ensureSpace(14);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        columns.forEach((column) => {
          doc.text(column.label, column.x, y + 5.2);
        });
        y += 10;
      };

      drawLineItemsHeader();

      if (displayDeal.services?.length) {
        displayDeal.services.forEach((service) => {
          const quantity = getServiceQuantity(service, displayDeal.contract_type);
          const lineTotal = getServiceLineTotal(service, displayDeal.contract_type);
          if (lineTotal !== null) computedTotal += lineTotal;

          const serviceLines = doc.splitTextToSize(service.service_name || "—", 86);
          const rowHeight = Math.max(8, serviceLines.length * 4 + 2);
          const rowTextY = y + 4.5;
          if (rowTextY + rowHeight > pageHeight - margin) {
            doc.addPage();
            y = 18;
            drawLineItemsHeader();
          }
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text(serviceLines, columns[0].x, y + 4.5);
          doc.text(quantity === null ? "—" : String(quantity), columns[1].x, y + 4.5);
          doc.text(formatMoney(service.rate), columns[2].x, y + 4.5);
          doc.text(lineTotal === null ? "—" : formatMoney(lineTotal), columns[3].x, y + 4.5, { align: "right" });
          y += rowHeight + 2;
        });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text("No services added.", margin + 3, y + 4.5);
        y += 10;
      }

      ensureSpace(18);
      y += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Order Total", margin + 120, y);
      doc.text(formatMoney(displayDeal.value || computedTotal), margin + contentWidth, y, { align: "right" });
      y += 12;

      addSectionTitle("Description");
      y += 2;
      y = await renderRichTextHtml(doc, displayDeal.description, margin, y, contentWidth, pageHeight, margin);

      const footerText = "© 2026 A Row Above Consulting d.b.a. Fortafy.  Confidential & Proprietary.";
      const footerY = pageHeight - 5.2;
      const pageCount = doc.getNumberOfPages();
      for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
        doc.setPage(pageIndex);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(footerText, pageWidth / 2, footerY, { align: "center" });
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
      setLastStablePdfUrl(fileUrl);
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
      <>
        <ProposalPdfEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          deal={displayDeal}
          pdfUrl={pdfUrl || lastStablePdfUrl}
          onSent={() => queryClient.invalidateQueries({ queryKey: ["deal-activity-records", deal.id] })}
        />
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
          {(pdfUrl || lastStablePdfUrl) && (
            <>
              <a
                href={pdfUrl || lastStablePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View PDF
              </a>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEmailDialogOpen(true)}
                className="h-8 px-3 text-xs"
              >
                <Mail className="h-3.5 w-3.5" />
                Email PDF
              </Button>
            </>
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
      </>
    );
  }

  return (
    <>
      <ProposalPdfEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        deal={displayDeal}
        pdfUrl={pdfUrl || lastStablePdfUrl}
        onSent={() => queryClient.invalidateQueries({ queryKey: ["deal-activity-records", deal.id] })}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(pdfUrl || lastStablePdfUrl) && (
          <>
            <a
              href={pdfUrl || lastStablePdfUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <ExternalLink className="h-3 w-3" />
              View PDF
            </a>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                setEmailDialogOpen(true);
              }}
              className="h-6 px-2 text-[10px]"
            >
              <Mail className="h-3 w-3" />
              Email PDF
            </Button>
          </>
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
    </>
  );
}