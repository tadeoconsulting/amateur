"use client";

import Link from "next/link";
import { useWizard } from "./wizard-context";

const STEPS = [
  { key: "info", label: "Información", hint: "Nombre, fecha y sede", path: "" },
  { key: "modalidad", label: "Modalidad", hint: "Formato, categoría y equipos", path: "/paso-2" },
  { key: "bases", label: "Bases", hint: "Tiempos, llaves y costos", path: "/paso-3" },
] as const;

export type WizardStep = (typeof STEPS)[number]["key"];

/**
 * El marco de las tres pantallas del asistente (crear y editar un torneo).
 *
 * - **Celular:** una columna de 430 px, igual que siempre (la barra de pasos o las pestañas van dentro
 *   de cada pantalla).
 * - **Escritorio (desde 768 px):** a la izquierda, un riel con los tres pasos y su estado; a la
 *   derecha, el formulario en una tarjeta de ancho cómodo. El riel reemplaza a la barra de pasos y a
 *   las pestañas. Al crear, se puede volver a un paso ya hecho (lo escrito se conserva) pero no saltar
 *   adelante; al editar, las tres secciones se navegan libremente.
 */
export function WizardShell({ current, children }: { current: WizardStep; children: React.ReactNode }) {
  const { tournamentId, basePath } = useWizard();
  const editing = tournamentId !== null;
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-surface-primary md:min-h-0 md:max-w-5xl md:flex-row md:items-start md:justify-center md:gap-12 md:px-8 md:py-10">
      <aside className="hidden md:sticky md:top-24 md:block md:w-64 md:shrink-0">
        <h2 className="font-heading text-lg font-bold text-text-primary">{editing ? "Editar torneo" : "Crear torneo"}</h2>
        <nav aria-label={editing ? "Secciones del torneo" : "Pasos para crear el torneo"} className="mt-6">
          <ol className="flex flex-col gap-1">
            {STEPS.map((step, i) => {
              const active = step.key === current;
              const done = !editing && i < currentIndex;
              const reachable = editing || i <= currentIndex;
              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold ${
                      active ? "bg-surface-secondary text-text-invert" : done ? "bg-verification text-text-primary" : "border border-border-primary text-text-secondary"
                    }`}
                  >
                    {done ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-heading text-sm font-semibold ${active ? "text-text-primary" : reachable ? "text-text-primary" : "text-text-secondary"}`}>{step.label}</span>
                    <span className="block font-body text-xs text-text-secondary">{step.hint}</span>
                  </span>
                </>
              );
              const base = "flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition-colors";
              return (
                <li key={step.key}>
                  {reachable && !active ? (
                    <Link href={`${basePath}${step.path}`} replace={editing} className={`${base} hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary`}>
                      {body}
                    </Link>
                  ) : (
                    <div aria-current={active ? "step" : undefined} className={`${base} ${active ? "bg-btn-regular" : "opacity-60"}`}>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col md:min-w-0 md:max-w-xl md:rounded-2xl md:border md:border-border-primary">{children}</div>
    </div>
  );
}
