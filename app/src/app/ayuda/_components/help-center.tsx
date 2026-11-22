"use client";

import { useState } from "react";
import { Accordion } from "@/_components/accordion";
import { Tabs } from "@/_components/tabs";
import { categoriesOf, type ContentSection } from "@/_lib/content";

/** Las preguntas del Centro de ayuda, con una pestaña por categoría (las categorías las define el admin). */
export function HelpCenter({ sections }: { sections: ContentSection[] }) {
  const categories = categoriesOf(sections);
  const [active, setActive] = useState(categories[0] ?? "");
  // Si el admin quitó la categoría que estaba abierta, se vuelve a la primera.
  const current = categories.includes(active) ? active : (categories[0] ?? "");

  if (categories.length === 0) {
    return <p className="mt-6 font-body text-sm text-text-secondary">Todavía no hay preguntas frecuentes.</p>;
  }

  const items = sections.filter((s) => s.category === current).map((s) => ({ question: s.title, answer: s.body }));
  return (
    <>
      {categories.length > 1 && (
        <div className="mt-4">
          <Tabs label="Categorías de ayuda" value={current} onChange={setActive} tabs={categories.map((c) => ({ key: c, label: c }))} className="pb-1" />
        </div>
      )}
      <div className="mt-6">
        <Accordion key={current} items={items} defaultOpen={0} />
      </div>
    </>
  );
}
