import React from 'react';

export interface ComparisonRow {
  feature: string;
  analytics: string;
  competitor: string;
}

export function ComparisonMatrix({
  competitorName,
  rows,
}: {
  competitorName: string;
  rows: ComparisonRow[];
}) {
  return (
    <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden my-8 shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-[#f7f7f7] border-b border-[#ebebeb] font-mono text-[11px] uppercase text-[#71717a]">
            <tr>
              <th className="p-4 w-1/3">Feature & Capability</th>
              <th className="p-4 w-1/3 bg-black text-white">Analytics by Sufyaan Studio</th>
              <th className="p-4 w-1/3">{competitorName}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ebebeb] font-display">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-[#fafafa] transition-colors">
                <td className="p-4 font-medium text-black">{row.feature}</td>
                <td className="p-4 bg-black/[0.02] font-mono text-[13px] font-medium text-black">
                  {row.analytics}
                </td>
                <td className="p-4 text-[#71717a] font-mono text-[13px]">{row.competitor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
