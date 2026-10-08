import Link from "next/link";

const TABS = [
  { key: "info", label: "Información", path: "" },
  { key: "modalidad", label: "Modalidad", path: "/paso-2" },
  { key: "bases", label: "Bases", path: "/paso-3" },
] as const;

export type EditTab = (typeof TABS)[number]["key"];

/**
 * Al editar un torneo no hay pasos: las tres secciones (información, modalidad y bases) son pestañas
 * entre las que se navega libremente. Lo que se escribe se conserva al cambiar de pestaña (vive en
 * el asistente) y "Guardar cambios" guarda todo, desde cualquiera de ellas.
 */
export function EditTabs({ current, basePath }: { current: EditTab; basePath: string }) {
  return (
    <nav aria-label="Secciones del torneo" className="mb-6 flex gap-1 rounded-xl bg-btn-regular p-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`${basePath}${t.path}`}
          replace
          aria-current={t.key === current ? "page" : undefined}
          className={`flex-1 rounded-lg px-2 py-2 text-center font-heading text-sm font-semibold transition-colors ${
            t.key === current ? "bg-surface-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
