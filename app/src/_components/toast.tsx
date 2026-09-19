"use client";

import { useEffect } from "react";

export function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] flex justify-center px-4 pt-4">
      <div className="flex w-full max-w-[398px] items-center justify-between rounded-xl bg-verification px-4 py-3">
        <p className="text-sm font-medium text-white">{message}</p>
        <button onClick={onDismiss} className="shrink-0 text-white">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
