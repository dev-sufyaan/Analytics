'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({
  items,
  title = 'Frequently Asked Questions',
}: {
  items: FaqItem[];
  title?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="my-12">
      <div className="text-center mb-8">
        <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
          FAQ & VERIFICATION
        </span>
        <h3 className="font-display text-[26px] sm:text-[32px] font-medium tracking-[-0.6px] text-black">
          {title}
        </h3>
      </div>

      <div className="space-y-3 max-w-3xl mx-auto">
        {items.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="border border-[#ebebeb] rounded-[4px] overflow-hidden bg-white transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#fafafa]"
                aria-expanded={isOpen}
              >
                <span className="font-display text-[15px] sm:text-[16px] font-medium text-black">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#71717a] shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 font-display text-[14px] leading-[22px] text-[#71717a] border-t border-[#ebebeb] pt-4">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
