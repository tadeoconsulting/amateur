"use client";

import { useEffect } from "react";

/**
 * Aviso breve arriba de la pantalla. El de éxito es verde y el de error rojo; ambos con
 * texto oscuro (el blanco sobre estos colores no llega a 4.5:1). Se anuncia a lectores de
 * pantalla: los errores de inmediato (`alert`), el resto sin interrumpir (`status`).
 */
export function Toast({
  message,
  onDismiss,
  tone = "success",
}: {
  message: string;
  onDismiss: () => void;
  tone?: "success" | "error";
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, tone === "error" ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [onDismiss, tone]);

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] flex justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div
        role={tone === "error" ? "alert" : "status"}
        className={`flex w-full max-w-[398px] items-center justify-between gap-2 rounded-xl px-4 py-3 text-text-primary ${
          tone === "error" ? "bg-error" : "bg-verification"
        }`}
      >
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="-mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
