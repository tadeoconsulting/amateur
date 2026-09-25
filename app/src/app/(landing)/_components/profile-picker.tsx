"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PROFILES, type ProfileRole } from "@/lib/profiles";

/**
 * Lista desplegable de perfiles. Con `multiple` se pueden marcar varios y la lista sigue abierta;
 * sin `multiple` se elige uno (volver a tocarlo lo quita). Se despliega dentro del flujo de la
 * página, no flotando, para que no la corte el scroll del modal.
 */
export function ProfilePicker({
  label,
  hint,
  placeholder,
  value,
  onChange,
  multiple = false,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  value: ProfileRole[];
  onChange: (value: ProfileRole[]) => void;
  multiple?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function pick(role: ProfileRole) {
    if (multiple) {
      onChange(value.includes(role) ? value.filter((r) => r !== role) : [...value, role]);
      return;
    }
    onChange(value.includes(role) ? [] : [role]);
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Escape cierra solo la lista; sin stopPropagation cerraría todo el modal.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const summary = PROFILES.filter((p) => value.includes(p.role))
    .map((p) => p.label)
    .join(", ");

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className="mt-1">
      <span id={`${id}-label`} className="mb-1 block font-heading text-sm font-semibold text-text-primary">
        {label}
      </span>
      {hint && <span className="mb-2 block font-body text-xs text-text-secondary">{hint}</span>}

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-brand-300 px-4 py-3 text-left font-body text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-field-green"
      >
        <span id={`${id}-value`} className={`min-w-0 flex-1 truncate ${summary ? "text-text-primary" : "text-text-secondary"}`}>
          {summary || placeholder}
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-multiselectable={multiple}
          aria-labelledby={`${id}-label`}
          className="mt-1 flex flex-col overflow-hidden rounded-lg border border-border-primary bg-surface-primary"
        >
          {PROFILES.map((profile) => {
            const selected = value.includes(profile.role);
            return (
              <li key={profile.role} role="presentation" className="border-b border-border-primary last:border-0">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(profile.role)}
                  className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-brand-300 focus-visible:bg-brand-300 focus-visible:outline-none ${
                    selected ? "bg-brand-300" : ""
                  }`}
                >
                  <span className="text-text-primary [&>svg]:h-6 [&>svg]:w-6">{profile.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-sm font-semibold text-text-primary">{profile.label}</span>
                    <span className="block font-body text-xs text-text-secondary">{profile.description}</span>
                  </span>
                  {multiple ? (
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        selected ? "border-surface-secondary bg-surface-secondary text-text-invert" : "border-border-primary"
                      }`}
                    >
                      {selected && <Check />}
                    </span>
                  ) : (
                    <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-text-primary">
                      {selected && <Check />}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
