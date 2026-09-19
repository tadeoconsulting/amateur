"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const hours = [
  "06:00 am", "07:00 am", "08:00 am", "09:00 am", "10:00 am",
  "11:00 am", "12:00 pm", "1:00 pm", "2:00 pm", "3:00 pm",
  "4:00 pm", "5:00 pm", "6:00 pm", "7:00 pm", "8:00 pm",
  "9:00 pm", "10:00 pm", "11:00 pm",
];

const minutes = [
  "00 min", "05 min", "10 min", "15 min", "20 min",
  "25 min", "30 min", "35 min", "40 min", "45 min",
  "50 min", "55 min",
];

export function TimePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string | null;
  onChange: (time: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"hour" | "minute">("hour");
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const btn = buttonRef.current;
    const shell = btn.closest("main") || btn.closest("[class*='max-w']") || document.body;
    const shellRect = shell.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setPos({
      top: btnRect.bottom + 4,
      left: shellRect.left + 16,
      width: shellRect.width - 32,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setStep("hour");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, updatePos]);

  function handleHourSelect(hour: string) {
    setSelectedHour(hour);
    setStep("minute");
  }

  function handleMinuteSelect(min: string) {
    const minNum = min.replace(" min", "");
    const hourBase = selectedHour!.replace(":00", ":" + minNum.padStart(2, "0"));
    onChange(hourBase);
    setOpen(false);
    setStep("hour");
  }

  return (
    <div className="flex-1">
      <button
        ref={buttonRef}
        onClick={() => {
          setStep("hour");
          setOpen(!open);
        }}
        className="flex w-full cursor-pointer items-center rounded-lg border border-border-primary px-3 py-3 transition-colors hover:bg-btn-regular"
      >
        <span className={`flex-1 text-left font-body text-sm ${value ? "text-text-primary" : "text-text-secondary"}`}>
          {value || placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-secondary">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="fixed z-50 overflow-hidden rounded-xl border border-border-primary bg-surface-primary shadow-lg"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {/* Step header */}
          <div className="border-b border-brand-200 px-4 py-3">
            <p className="font-heading text-sm font-bold text-text-primary">
              {step === "hour" ? "Selecciona la hora" : "Selecciona los minutos"}
            </p>
          </div>

          {/* Scrollable list */}
          <div className="max-h-[240px] overflow-y-auto">
            {(step === "hour" ? hours : minutes).map((item) => (
              <button
                key={item}
                onClick={() => step === "hour" ? handleHourSelect(item) : handleMinuteSelect(item)}
                className="flex w-full cursor-pointer items-center px-5 py-3 font-body text-sm text-text-primary transition-colors hover:bg-btn-regular"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
