"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { firstEnabledIndex, lastEnabledIndex, nextEnabledIndex } from "@/_lib/actions-menu";

export type ActionItem = {
  key: string;
  label: string;
  /** Un ícono de `actionIcons` (o cualquier nodo de 18 px). */
  icon?: React.ReactNode;
  /** Lleva a otra pantalla (se dibuja como enlace). Sin `href`, ejecuta `onSelect`. */
  href?: string;
  onSelect?: () => void;
  /** `danger` para lo destructivo: se dibuja en rojo y, con `separated`, aparte. */
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Una línea fina encima, para separar un grupo (por ejemplo, lo destructivo). */
  separated?: boolean;
};

const stroke = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
const svg = (children: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
    {children}
  </svg>
);

/** Íconos de 18 px para los ítems del menú. */
export const actionIcons = {
  share: svg(<path d="M10 12.5V3m0 0L6.5 6.5M10 3l3.5 3.5M4.5 10.5v5A1.5 1.5 0 006 17h8a1.5 1.5 0 001.5-1.5v-5" {...stroke} />),
  edit: svg(<path d="M12.5 4.5l3 3M4 16l.7-3.3L13.4 4a1.4 1.4 0 012 0l.6.6a1.4 1.4 0 010 2l-8.7 8.7L4 16z" {...stroke} />),
  desk: svg(<path d="M3 7h14M5 7v9M15 7v9M3 4h14v3H3zM8 11h4" {...stroke} />),
  swap: svg(<path d="M4 7h11m0 0l-3-3m3 3l-3 3M16 13H5m0 0l3-3m-3 3l3 3" {...stroke} />),
  season: svg(<path d="M4 6a2 2 0 012-2h8a2 2 0 012 2v9a1 1 0 01-1 1H5a1 1 0 01-1-1V6zM4 8h12M7 2.5V5m6-2.5V5" {...stroke} />),
  undo: svg(<path d="M7 5L3.5 8.5 7 12M4 8.5h7.5a4 4 0 010 8H9" {...stroke} />),
};

/**
 * Menú desplegable «Acciones» (especificación 021): agrupa las acciones secundarias de una pantalla para que la
 * principal destaque. Teclado: Enter, Espacio o ↓ abren; ↑ ↓ recorren con vuelta; Inicio y Fin saltan; Escape cierra y
 * devuelve el foco al botón; Tab cierra. Se cierra al elegir y al tocar fuera.
 */
export function ActionsMenu({ items, label = "Acciones", className = "" }: { items: ActionItem[]; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  // A qué ítem enfocar cuando el panel termine de abrirse.
  const focusOnOpen = useRef<"first" | "last">("first");
  const menuId = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const index = focusOnOpen.current === "last" ? lastEnabledIndex(items) : firstEnabledIndex(items);
    itemRefs.current[index]?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // Solo al abrir: si `items` cambia con el menú abierto no se le quita el foco al ítem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (items.length === 0) return null;

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusOnOpen.current = e.key === "ArrowUp" ? "last" : "first";
      setOpen(true);
    }
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const goTo = (index: number) => {
      e.preventDefault();
      if (index >= 0) itemRefs.current[index]?.focus();
    };
    if (e.key === "ArrowDown") goTo(nextEnabledIndex(items, current, 1));
    else if (e.key === "ArrowUp") goTo(nextEnabledIndex(items, current, -1));
    else if (e.key === "Home") goTo(firstEnabledIndex(items));
    else if (e.key === "End") goTo(lastEnabledIndex(items));
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") setOpen(false);
  }

  const itemClass = (item: ActionItem) =>
    `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-heading text-sm font-semibold cancha:font-body cancha:font-bold transition-colors hover:bg-btn-regular focus-visible:bg-btn-regular focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
      item.tone === "danger" ? "text-red" : "text-text-primary"
    }`;

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          focusOnOpen.current = "first";
          setOpen((o) => !o);
        }}
        onKeyDown={onTriggerKeyDown}
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border-primary px-4 font-heading text-sm font-bold text-text-primary cancha:font-body cancha:font-bold transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
          open ? "bg-btn-regular" : ""
        }`}
      >
        {label}
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="animate-menu-in absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-border-primary bg-surface-alt p-1.5 shadow-xl shadow-black/40"
        >
          {items.map((item, i) => {
            const content = (
              <>
                {item.icon && <span className="shrink-0 text-text-secondary">{item.icon}</span>}
                <span className="min-w-0 flex-1">{item.label}</span>
              </>
            );
            const separator = item.separated && i > 0 ? <div role="separator" className="my-1.5 h-px bg-border-primary" /> : null;
            return (
              <div key={item.key}>
                {separator}
                {item.href && !item.disabled ? (
                  <Link
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    href={item.href}
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => setOpen(false)}
                    className={itemClass(item)}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    disabled={item.disabled}
                    onClick={() => {
                      close(false);
                      item.onSelect?.();
                    }}
                    className={itemClass(item)}
                  >
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
