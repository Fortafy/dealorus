import React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const hexToRgba = (hex, alpha) => {
  if (!hex || typeof hex !== "string") return `rgba(124, 58, 237, ${alpha})`;
  const normalized = hex.replace("#", "");
  const fullHex = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  if (fullHex.length !== 6) return `rgba(124, 58, 237, ${alpha})`;

  const bigint = Number.parseInt(fullHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function LabelBadge({ label, removable = false, onRemove, className = "" }) {
  const color = label?.color || "#7c3aed";

  return (
    <Badge
      variant="outline"
      className={`gap-1 border px-2 py-0.5 text-[11px] font-medium ${className}`}
      style={{
        color,
        borderColor: hexToRgba(color, 0.24),
        backgroundColor: hexToRgba(color, 0.12),
      }}
    >
      <span>{label?.name}</span>
      {removable ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full transition-opacity hover:opacity-70"
          aria-label={`Remove ${label?.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </Badge>
  );
}