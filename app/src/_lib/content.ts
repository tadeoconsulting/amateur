// El contenido editable por el admin (especificación 016): Centro de ayuda, Términos y condiciones y Políticas.
// Lógica pura y sin dependencias: la usan la API, las páginas y las pruebas.

export type ContentKind = "AYUDA" | "TERMINOS" | "POLITICAS";

/** El tipo tal como va en la dirección (`/api/admin/contenido/:kind`) y su nombre en pantalla. */
export const CONTENT_KINDS: { kind: ContentKind; slug: string; label: string }[] = [
  { kind: "AYUDA", slug: "ayuda", label: "Centro de ayuda" },
  { kind: "TERMINOS", slug: "terminos", label: "Términos y condiciones" },
  { kind: "POLITICAS", slug: "politicas", label: "Políticas de privacidad" },
];

export function kindFromSlug(slug: string): ContentKind | null {
  return CONTENT_KINDS.find((k) => k.slug === slug)?.kind ?? null;
}

/** Una sección de un documento. En Ayuda es una pregunta (`title`) con su respuesta (`body`) y una categoría. */
export interface ContentSection {
  category: string | null;
  title: string;
  body: string;
}

export const LIMITS = { sections: 100, title: 200, body: 5000, category: 60 } as const;

export type ValidationResult = { ok: true; sections: ContentSection[] } | { ok: false; error: string };

/**
 * Valida y normaliza las secciones que envía el editor. Recorta los espacios de los bordes y deja la categoría en
 * `null` fuera de Ayuda. Devuelve el primer problema con un mensaje que dice cuál sección es (1, 2, 3…).
 */
export function validateSections(kind: ContentKind, input: unknown): ValidationResult {
  if (!Array.isArray(input)) return { ok: false, error: "Se esperaba una lista de secciones." };
  if (input.length > LIMITS.sections) return { ok: false, error: `Hay demasiadas secciones (máximo ${LIMITS.sections}).` };

  const sections: ContentSection[] = [];
  for (let i = 0; i < input.length; i++) {
    const raw = input[i];
    const n = i + 1;
    if (typeof raw !== "object" || raw === null) return { ok: false, error: `La sección ${n} no es válida.` };
    const { category, title, body } = raw as Record<string, unknown>;
    if ((title !== undefined && typeof title !== "string") || typeof body !== "string" || (category != null && typeof category !== "string")) {
      return { ok: false, error: `La sección ${n} no es válida.` };
    }
    const t = (title ?? "").trim();
    const b = body.trim();
    const c = typeof category === "string" ? category.trim() : "";

    if (t.length > LIMITS.title) return { ok: false, error: `El título de la sección ${n} es demasiado largo (máximo ${LIMITS.title} caracteres).` };
    if (b.length > LIMITS.body) return { ok: false, error: `El texto de la sección ${n} es demasiado largo (máximo ${LIMITS.body} caracteres).` };
    if (!b) return { ok: false, error: `Falta el texto de la sección ${n}.` };

    if (kind === "AYUDA") {
      if (!c) return { ok: false, error: `Falta la categoría de la sección ${n}.` };
      if (c.length > LIMITS.category) return { ok: false, error: `La categoría de la sección ${n} es demasiado larga (máximo ${LIMITS.category} caracteres).` };
      if (!t) return { ok: false, error: `Falta la pregunta de la sección ${n}.` };
      sections.push({ category: c, title: t, body: b });
    } else {
      sections.push({ category: null, title: t, body: b });
    }
  }
  return { ok: true, sections };
}

/** Las categorías de Ayuda (las pestañas), sin repetir y en el orden en que aparecen. */
export function categoriesOf(sections: readonly ContentSection[]): string[] {
  const seen: string[] = [];
  for (const s of sections) if (s.category && !seen.includes(s.category)) seen.push(s.category);
  return seen;
}

/** Los párrafos de un texto: se separan por una línea en blanco; las líneas sueltas se conservan dentro del párrafo. */
export function paragraphsOf(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
