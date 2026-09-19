"use client";

export function BackHeader({ onBack, label }: { onBack?: () => void; label?: string }) {
  return (
    <header className="px-4 py-3">
      <button
        onClick={onBack ?? (() => window.history.back())}
        className="flex items-center gap-1 font-heading text-base font-semibold text-text-primary"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
          <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label ?? "Volver"}
      </button>
    </header>
  );
}
