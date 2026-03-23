import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays } from "lucide-react";
import moment from "moment";
import DealEditorDialog from "@/components/deals/DealEditorDialog";
import DealProposalPdfActions from "@/components/deals/DealProposalPdfActions";

const CONTRACT_TYPES = [
  { value: "monthly_retainer", label: "Monthly Retainer" },
  { value: "ad_hoc", label: "Ad Hoc" },
  { value: "project", label: "Project" },
];

export default function KanbanDealCard({ deal, isDragging, lifecycleStages, onUpdate }) {
  const [showEdit, setShowEdit] = useState(false);

  const contractLabel = CONTRACT_TYPES.find((t) => t.value === deal.contract_type)?.label;
  const displayDate = deal.remind_at || deal.expected_close_date;
  const isPastOrToday = displayDate
    ? moment(displayDate).startOf("day").isSameOrBefore(moment().startOf("day"))
    : false;
  const dateToneClass = isPastOrToday ? "text-red-600" : "text-slate-400";
  const dateLabel = deal.remind_at ? "Reminder" : "Close";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowEdit(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setShowEdit(true);
          }
        }}
        className={`bg-white rounded-lg border p-3 text-xs transition-shadow cursor-pointer ${isDragging ? "shadow-lg border-blue-300" : "border-slate-200 shadow-sm hover:shadow-md"}`}
      >
        <div className="mb-1.5">
          <p className="truncate font-semibold leading-snug text-slate-800">{deal.name}</p>
        </div>

        {deal.organization_name && deal.organization_id && (
          <div className="mb-2 flex items-center gap-1 text-[11px] text-slate-500">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <Link
              to={`/Organizations?id=${deal.organization_id}`}
              onClick={(event) => event.stopPropagation()}
              className="truncate hover:text-blue-600 hover:underline"
            >
              {deal.organization_name}
            </Link>
          </div>
        )}

        <div className="mt-1 flex flex-wrap gap-1">
          {deal.value > 0 && (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700">
              ${deal.value.toLocaleString()}
            </Badge>
          )}
          {contractLabel && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-slate-500">
              {contractLabel}
            </Badge>
          )}
        </div>

        {displayDate && (
          <div className={`mt-1.5 flex items-center gap-1 text-[10px] ${dateToneClass}`}>
            <CalendarDays className={`h-3 w-3 ${dateToneClass}`} />
            <span>{dateLabel} {moment(displayDate).format("MMM D, YYYY")}</span>
          </div>
        )}

        <DealProposalPdfActions
          deal={deal}
          lifecycleStages={lifecycleStages}
          onUpdated={onUpdate}
        />
      </div>

      <DealEditorDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        deal={deal}
        clientId={deal.client_id}
        lifecycleStages={lifecycleStages}
        onSaved={onUpdate}
      />
    </>
  );
}