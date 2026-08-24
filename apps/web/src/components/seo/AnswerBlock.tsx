import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export interface AnswerBlockProps {
  title?: string;
  directAnswer: string;
  keyTakeaways?: string[];
  lastUpdated?: string;
  author?: string;
}

export function AnswerBlock({
  title = 'Direct Answer / TL;DR',
  directAnswer,
  keyTakeaways,
  lastUpdated = 'August 2026',
  author = 'Sufyaan Studio Research',
}: AnswerBlockProps) {
  return (
    <div className="my-8 rounded-[6px] border border-[#26263a]/15 bg-[#fafafa] p-6 sm:p-7 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#ebebeb]">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#fc4c02]" />
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-black">
            {title}
          </span>
        </div>
        <div className="font-mono text-[11px] text-[#71717a] flex items-center gap-3">
          <span>By {author}</span>
          <span>•</span>
          <span>Verified {lastUpdated}</span>
        </div>
      </div>

      <p className="font-display text-[16px] sm:text-[17px] leading-[26px] text-black font-normal">
        {directAnswer}
      </p>

      {keyTakeaways && keyTakeaways.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#ebebeb]/80">
          <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-2 font-medium">
            KEY TAKEAWAYS
          </span>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-display text-[13px] text-[#26263a]">
            {keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
