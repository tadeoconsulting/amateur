"use client";

import { useState } from "react";
import { CONTENT_KINDS, type ContentKind } from "@/_lib/content";
import { ContentEditor } from "./_components/content-editor";
import { Tabs } from "@/_components/tabs";

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

      <Tabs label="Tipo de contenido" value={kind} onChange={choose} tabs={CONTENT_KINDS.map((k) => ({ key: k.kind, label: k.label }))} className="mb-5" />

      <ContentEditor key={kind} kind={kind} onDirtyChange={setDirty} />
    </div>
  );
}
