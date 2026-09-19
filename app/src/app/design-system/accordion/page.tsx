"use client";

import { useState } from "react";
import { Accordion } from "@/_components/accordion";
import { CategoryTabs } from "@/_components/category-tabs";

const demoItems = [
  {
    question: "Pregunta de ejemplo 01?",
    answer: "Respuesta de la pregunta, con texto de ejemplo para mostrar como se ve el contenido expandido dentro del accordion.",
  },
  {
    question: "Pregunta de ejemplo 02?",
    answer: "Segunda respuesta de ejemplo. El accordion permite que solo un item este abierto a la vez.",
  },
  {
    question: "Pregunta de ejemplo 03?",
    answer: "Tercera respuesta de ejemplo. Al hacer click en un item abierto, este se cierra.",
  },
];

const tabCategories = ["General", "Torneos", "Clubes"];

export default function AccordionPage() {
  const [activeTab, setActiveTab] = useState(tabCategories[0]);

  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Components
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Accordion
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Componente reutilizable para FAQ y contenido expandible.
          Importado desde <code className="rounded bg-brand-300 px-1 text-xs">@/_components/accordion</code>.
          Usado en Centro de ayuda.
        </p>
      </header>

      {/* Live Accordion */}
      <Section title="Accordion">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Interactivo — click para expandir/colapsar
          </p>
          <Accordion items={demoItems} defaultOpen={0} />
        </div>
        <CodeRef component="Accordion" path="@/_components/accordion.tsx" props={["items: { question, answer }[]", "defaultOpen?: number | null"]} />
      </Section>

      {/* Category Tabs */}
      <Section title="CategoryTabs">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Interactivo — click para cambiar tab activo
          </p>
          <CategoryTabs
            categories={tabCategories}
            active={activeTab}
            onChange={setActiveTab}
          />
          <p className="mt-4 text-sm text-text-secondary">
            Tab activo: <span className="font-semibold text-text-primary">{activeTab}</span>
          </p>
        </div>
        <CodeRef component="CategoryTabs" path="@/_components/category-tabs.tsx" props={["categories: string[]", "active: string", "onChange: (cat: string) => void"]} />
      </Section>

      {/* Combined */}
      <Section title="Tabs + Accordion combinados">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Patron usado en /ayuda
          </p>
          <CategoryTabs
            categories={["FAQ", "Soporte"]}
            active="FAQ"
            onChange={() => {}}
          />
          <div className="mt-4">
            <Accordion items={demoItems.slice(0, 2)} defaultOpen={0} />
          </div>
        </div>
      </Section>

      {/* Anatomy */}
      <section className="mt-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">Anatomia</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 text-[10px] text-text-secondary uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Propiedad</th>
                <th className="px-4 py-2.5 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-200 text-xs">
              {[
                ["Container", "border border-brand-200 bg-white rounded"],
                ["Padding", "px-3 py-3"],
                ["Font question", "font-body text-sm text-text-primary"],
                ["Font answer", "font-body text-sm text-text-secondary"],
                ["Chevron", "16px, rotate-180 on open"],
                ["Gap entre items", "gap-3 (12px)"],
                ["Tab active bg", "bg-brand-900 text-text-invert"],
                ["Tab inactive", "bg-transparent border-border-primary"],
              ].map(([prop, val]) => (
                <tr key={prop}>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{prop}</td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-heading text-xl font-bold text-text-primary">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function CodeRef({ component, path, props }: { component: string; path: string; props: string[] }) {
  return (
    <div className="mt-3 rounded-lg bg-brand-900 p-4 text-xs text-brand-200 font-mono overflow-x-auto">
      <p className="text-brand-500">{"// Import"}</p>
      <p>{`import { ${component} } from "${path}";`}</p>
      <p className="mt-2 text-brand-500">{"// Props"}</p>
      {props.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
