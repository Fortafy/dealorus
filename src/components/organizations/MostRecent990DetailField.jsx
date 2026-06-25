import React from "react";
import { ExternalLink } from "lucide-react";

export default function MostRecent990DetailField({ value }) {
  if (!value) {
    return (
      <div className="flex min-h-10 items-center px-3 py-2 text-xs text-slate-400">
        Not available
      </div>
    );
  }

  const href = value.startsWith("http") ? value : `https://${value}`;

  return (
    <div className="flex min-h-10 items-center px-3 py-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        View Latest Form 990
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}