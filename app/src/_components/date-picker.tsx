"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];
const dayHeaders = ["D", "L", "M", "M", "J", "V", "S"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const days: { day: number; current: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrev - i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, current: true });
  }
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, current: false });
    }
  }

  return days;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

export function DatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? now.getMonth());
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const days = getCalendarDays(viewYear, viewMonth);

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
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, updatePos]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function isSelected(day: number, current: boolean) {
    if (!value || !current) return false;
    return value.getFullYear() === viewYear && value.getMonth() === viewMonth && value.getDate() === day;
  }

  return (
    <div className="flex-1">
      <button
        ref={buttonRef}
        onClick={() => {
          if (!open && value) {
            setViewYear(value.getFullYear());
            setViewMonth(value.getMonth());
          }
          setOpen(!open);
        }}
        className="flex w-full cursor-pointer items-center rounded-lg border border-border-primary px-3 py-3 transition-colors hover:bg-btn-regular"
      >
        <span className={`flex-1 text-left font-body text-sm ${value ? "text-text-primary" : "text-text-secondary"}`}>
          {value ? formatDate(value) : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-secondary">
          <path d="M2.5 2h11a.5.5 0 01.5.5V5H2V2.5A.5.5 0 012.5 2zM2 5h12v8.5a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5V5z" stroke="currentColor" strokeWidth="1" />
          <path d="M5 1v2M11 1v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="fixed z-50 rounded-xl border border-border-primary bg-surface-primary p-5 shadow-lg"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {/* Month nav */}
          <div className="mb-3 flex items-center justify-between">
            <span className="font-heading text-base font-bold text-text-primary">
              {monthNames[viewMonth]}
            </span>
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button onClick={nextMonth} className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7">
            {dayHeaders.map((h, i) => (
              <div key={i} className="text-center font-heading text-xs font-semibold text-text-secondary">
                {h}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  if (d.current) {
                    onChange(new Date(viewYear, viewMonth, d.day));
                    setOpen(false);
                  }
                }}
                className={`flex h-10 w-full cursor-pointer items-center justify-center rounded-full font-body text-sm transition-colors ${
                  isSelected(d.day, d.current)
                    ? "bg-surface-secondary text-text-invert font-bold"
                    : d.current
                      ? "text-text-primary hover:bg-btn-regular"
                      : "text-text-secondary/40"
                }`}
              >
                {d.day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
