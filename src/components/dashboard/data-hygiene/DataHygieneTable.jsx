import React from "react";

export default function DataHygieneTable({ columns, rows }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="w-full text-xs" style={{ tableLayout: "fixed", minWidth: columns.reduce((sum, column) => sum + (column.width || 180), 0) }}>
        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="border-r border-slate-200 px-3 py-2.5 text-left font-semibold text-slate-600 last:border-r-0" style={{ width: column.width || 180 }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column.key} className="border-r border-slate-100 px-3 py-2 align-top text-slate-600 last:border-r-0">
                  <div className="break-words whitespace-normal">{column.render ? column.render(row) : row[column.key]}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}