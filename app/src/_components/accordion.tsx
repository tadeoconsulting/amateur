"use client";

import { useState } from "react";

interface AccordionItem {
  question: string;
  answer: string;
}

export function Accordion({
  items,
  defaultOpen = null,
}: {
  items: AccordionItem[];
  defaultOpen?: number | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpen);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="rounded border border-brand-200 bg-white">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between px-3 py-3 text-left"
            >
              <span className="font-body text-sm text-text-primary">
                {item.question}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                className={`shrink-0 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isOpen && (
              <div className="border-t border-brand-200 px-3 py-3">
                <p className="font-body text-sm leading-relaxed text-text-secondary">
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
