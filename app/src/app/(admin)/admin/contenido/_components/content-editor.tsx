"use client";

import { useEffect, useRef, useState } from "react";
import { CONTENT_KINDS, LIMITS as limits, categoriesOf, type ContentKind, type ContentSection } from "@/_lib/content";

// Cada sección lleva un `uid` solo para que React la reconozca al subirla, bajarla o quitarla.
type Draft = ContentSection & { uid: number };

const FIELD =
  "w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500";
const ICON_BTN =
  "cursor-pointer rounded-lg border border-border-primary px-2.5 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular disabled:cursor-not-allowed disabled:opacity-40";

const plain = (list: Draft[]): ContentSection[] => list.map(({ category, title, body }) => ({ category, title, body }));

/** El editor de un tipo de contenido: carga las secciones, las edita en pantalla y las guarda de una vez. */
export function ContentEditor({ kind, onDirtyChange }: { kind: ContentKind; onDirtyChange: (dirty: boolean) => void }) {
  const label = CONTENT_KINDS.find((k) => k.kind === kind)!.label;
  const slug = CONTENT_KINDS.find((k) => k.kind === kind)!.slug;
  const isHelp = kind === "AYUDA";

  const nextUid = useRef(1);
  const withUids = (list: ContentSection[]): Draft[] => list.map((s) => ({ ...s, uid: nextUid.current++ }));

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sections, setSections] = useState<Draft[]>([]);
  const [saved, setSaved] = useState("[]");
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = (data: { sections: ContentSection[]; usingDefaults: boolean }) => {
    setSections(withUids(data.sections));
    setSaved(JSON.stringify(data.sections));
    setUsingDefaults(data.usingDefaults);
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/contenido/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!cancelled) apply(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("No se pudo cargar el contenido. Actualiza la página e inténtalo de nuevo.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const dirty = JSON.stringify(plain(sections)) !== saved;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  // Aviso del navegador si cierra o recarga la página con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (uid: number, patch: Partial<ContentSection>) => {
    setMessage(null);
    setSections((prev) => prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)));
  };
  const move = (index: number, delta: -1 | 1) => {
    setMessage(null);
    setSections((prev) => {
      const next = [...prev];
      const to = index + delta;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };
  const remove = (uid: number) => {
    setMessage(null);
    setSections((prev) => prev.filter((s) => s.uid !== uid));
  };
  const add = () => {
    setMessage(null);
    // En Ayuda la sección nueva hereda la categoría de la última, que es lo más común al cargar varias seguidas.
    const category = isHelp ? (sections.at(-1)?.category ?? "") : null;
    setSections((prev) => [...prev, ...withUids([{ category, title: "", body: "" }])]);
  };

  async function save(list: ContentSection[], doneText: string) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/contenido/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: list }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "No se pudo guardar." });
        return;
      }
      apply(data);
      setMessage({ ok: true, text: doneText });
    } catch {
      setMessage({ ok: false, text: "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  const restoreDefaults = () => {
    if (!window.confirm(`Se borrará lo que guardaste en «${label}» y la página volverá al texto de partida. ¿Continuar?`)) return;
    save([], "Se restauró el texto de partida.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  if (loadError) return <p role="alert" className="font-body text-sm text-red-600">{loadError}</p>;

  const categories = categoriesOf(plain(sections));

  return (
    <div className="max-w-3xl">
      {usingDefaults && (
        <p role="status" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 font-body text-sm text-amber-800">
          Todavía no guardaste una versión propia: abajo está el texto de partida, que es lo que ven hoy las personas. Edítalo y publícalo para que sea tuyo.
          {!isHelp && " Es un texto genérico: conviene que lo revise alguien legal antes de darlo por definitivo."}
        </p>
      )}

      <p className="mb-4 font-body text-sm text-text-secondary">
        {isHelp
          ? "Cada sección es una pregunta con su respuesta; la categoría arma las pestañas del Centro de ayuda."
          : "Cada sección tiene un título opcional y su texto. Una sección sin título se muestra como un párrafo suelto (sirve para la apertura)."}{" "}
        Escribe texto simple: para separar párrafos deja una línea en blanco.
      </p>

      <ol className="flex flex-col gap-4">
        {sections.map((s, i) => (
          <li key={s.uid} className="rounded-xl border border-border-primary bg-surface-primary p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Sección {i + 1}</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir la sección ${i + 1}`} className={ICON_BTN}>
                  Subir
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label={`Bajar la sección ${i + 1}`} className={ICON_BTN}>
                  Bajar
                </button>
                <button
                  type="button"
                  onClick={() => remove(s.uid)}
                  aria-label={`Quitar la sección ${i + 1}`}
                  className="cursor-pointer rounded-lg border border-red-200 px-2.5 py-1.5 font-heading text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                >
                  Quitar
                </button>
              </div>
            </div>

            {isHelp && (
              <label className="mb-3 block">
                <span className="mb-1 block font-body text-xs text-text-secondary">Categoría</span>
                <input
                  value={s.category ?? ""}
                  onChange={(e) => change(s.uid, { category: e.target.value })}
                  maxLength={limits.category}
                  list="categorias-ayuda"
                  className={FIELD}
                  placeholder="Ejemplo: General"
                />
              </label>
            )}
            <label className="mb-3 block">
              <span className="mb-1 block font-body text-xs text-text-secondary">{isHelp ? "Pregunta" : "Título (opcional)"}</span>
              <input
                value={s.title}
                onChange={(e) => change(s.uid, { title: e.target.value })}
                maxLength={limits.title}
                className={FIELD}
                placeholder={isHelp ? "Ejemplo: ¿Cómo creo mi cuenta?" : "Ejemplo: 1. Uso de la plataforma."}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-body text-xs text-text-secondary">{isHelp ? "Respuesta" : "Texto"}</span>
              <textarea
                value={s.body}
                onChange={(e) => change(s.uid, { body: e.target.value })}
                maxLength={limits.body}
                rows={5}
                className={`${FIELD} resize-y leading-relaxed`}
              />
            </label>
          </li>
        ))}
      </ol>

      {isHelp && <datalist id="categorias-ayuda">{categories.map((c) => <option key={c} value={c} />)}</datalist>}

      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed border-border-primary px-4 py-10 text-center font-body text-sm text-text-secondary">
          No hay secciones. Si publicas así, la página vuelve a mostrar el texto de partida.
        </p>
      )}

      <button
        type="button"
        onClick={add}
        disabled={sections.length >= limits.sections}
        className="mt-4 cursor-pointer rounded-lg border border-border-primary px-4 py-2.5 font-heading text-sm font-semibold text-text-primary transition-colors hover:bg-btn-regular disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Agregar sección
      </button>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-border-primary bg-brand-50 py-4">
        <button
          type="button"
          onClick={() => save(plain(sections), "Publicado. Ya se ve en la plataforma.")}
          disabled={saving || (!dirty && !usingDefaults)}
          className="cursor-pointer rounded-lg bg-surface-secondary px-5 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar y publicar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setSections(withUids(JSON.parse(saved)));
          }}
          disabled={saving || !dirty}
          className="cursor-pointer font-heading text-sm font-semibold text-text-primary underline disabled:cursor-not-allowed disabled:opacity-40"
        >
          Descartar cambios
        </button>
        {!usingDefaults && (
          <button
            type="button"
            onClick={restoreDefaults}
            disabled={saving}
            className="ml-auto cursor-pointer font-heading text-xs font-semibold text-text-secondary underline hover:text-text-primary"
          >
            Volver al texto de partida
          </button>
        )}
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`basis-full font-body text-sm ${message.ok ? "font-semibold text-text-primary" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
