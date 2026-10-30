"use client";

import { useState } from "react";
import { CONTENT_KINDS, type ContentKind } from "@/_lib/content";
import { ContentEditor } from "./_components/content-editor";

/**
 * Admin → Contenido (especificación 016): un editor aparte para cada tipo de documento común a la plataforma
 * (Centro de ayuda, Términos y condiciones, Políticas de privacidad).
 */
export default function AdminContenidoPage() {
  const [kind, setKind] = useState<ContentKind>("AYUDA");
  // El editor de cada tipo avisa si tiene cambios sin guardar, para no perderlos al cambiar de pestaña.
  const [dirty, setDirty] = useState(false);

  const choose = (next: ContentKind) => {
    if (next === kind) return;
    if (dirty && !window.confirm("Tienes cambios sin guardar en esta pestaña. ¿Descartarlos y cambiar?")) return;
    setDirty(false);
    setKind(next);
  };

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-text-primary">Contenido</h1>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Textos comunes a toda la plataforma. Cada tipo se edita y se publica por separado.
        </p>
      </div>

      <div role="tablist" aria-label="Tipo de contenido" className="mb-5 flex w-fit gap-1 rounded-xl bg-btn-regular p-1">
        {CONTENT_KINDS.map((k) => (
          <button
            key={k.kind}
            role="tab"
            type="button"
            aria-selected={kind === k.kind}
            onClick={() => choose(k.kind)}
            className={`cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold transition-colors ${
              kind === k.kind ? "bg-surface-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <ContentEditor key={kind} kind={kind} onDirtyChange={setDirty} />
    </div>
  );
}
