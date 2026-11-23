"use client";

import { useState } from "react";
import { Tabs } from "@/_components/tabs";
import "../../(landing)/_components/landing.css";

// Especificación 024. Todo lo que se ve aquí es el componente real `Tabs` (nunca una copia): si cambia en el sistema, cambia aquí.

const secciones = [
  { key: "partidos", label: "Partidos" },
  { key: "llaves", label: "Llaves" },
  { key: "tabla", label: "Tabla" },
  { key: "goleadores", label: "Goleadores" },
  { key: "equipos", label: "Equipos" },
  { key: "reglamento", label: "Reglamento" },
  { key: "galeria", label: "Galería" },
];
const estados = [
  { key: "en_vivo", label: "En vivo", count: 2 },
  { key: "proximos", label: "Próximos", count: 8 },
  { key: "finalizados", label: "Finalizados", count: 14 },
];
const filtros = [
  { key: "todos", label: "Todos" },
  { key: "clausura", label: "Clausura 2026", leading: <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red" aria-hidden="true" /> },
  { key: "apertura", label: "Apertura 2026" },
];
const roles = [
  { key: "organizador", label: "Organizador" },
  { key: "club", label: "Club" },
  { key: "jugador", label: "Jugador" },
  { key: "fan", label: "Fan" },
];

const variantes: [string, string, string, string][] = [
  ["sections", "Secciones", "Las secciones de una pantalla; es lo que cambia el contenido de abajo. Todos los ámbitos, también el celular.", "Detalle del torneo, equipo del club, ayuda, vista del admin"],
  ["segmented", "Segmentado", "Segundo nivel: pocas opciones cortas dentro de un contenedor o bajo un nivel principal.", "Estado de los partidos, género, sesiones, asistencia"],
  ["filters", "Filtros", "Filtrar una lista: píldora con aria-pressed, no cambia de sección.", "Torneo, categoría, club"],
  ["landing", "Landing", "Tarjetas de la landing, con su propio estilo (lima sobre tinta). Solo en la landing.", "La plataforma por rol"],
];

export default function TabsPage() {
  const [seccion, setSeccion] = useState("partidos");
  const [seccionBase, setSeccionBase] = useState("torneos");
  const [estado, setEstado] = useState("proximos");
  const [filtro, setFiltro] = useState("todos");
  const [rol, setRol] = useState("organizador");
  const [conPendientes, setConPendientes] = useState("torneo");

  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">Components</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">Tabs</h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Un solo componente con cuatro variantes. Importado desde <code className="rounded bg-brand-300 px-1 text-xs">@/_components/tabs</code>; no se arman tabs a mano
          (una prueba lo verifica). Reemplaza a PillTabs, SubTabs y CategoryTabs.
        </p>
      </header>

      <Section title="Cuál usar">
        <div className="overflow-x-auto rounded-xl border border-border-primary bg-surface-primary">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-primary text-[10px] uppercase tracking-wider text-text-secondary">
                <th className="px-4 py-2.5 font-medium">variant</th>
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">Cuándo</th>
                <th className="px-4 py-2.5 font-medium">Dónde se usa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary text-xs">
              {variantes.map(([v, nombre, cuando, donde]) => (
                <tr key={v}>
                  <td className="px-4 py-2.5 font-mono text-text-primary">{v}</td>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{nombre}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{cuando}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{donde}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-body text-sm text-text-secondary">
          Regla: las listas que se desplazan (muchas fechas, muchos torneos) van en <code className="rounded bg-brand-300 px-1 text-xs">sections</code>; el segmentado es solo para
          pocas opciones que caben a lo ancho. Con dos niveles, el principal son píldoras y el secundario va segmentado dentro del contenedor.
        </p>
      </Section>

      <Section title="Secciones (sections)">
        <Demo>
          <Tabs label="Secciones del torneo" value={seccion} onChange={setSeccion} tabs={secciones} />
        </Demo>
        <p className="font-body text-xs text-text-secondary">
          Se desplaza cuando no caben; con ratón aparecen flechas y con el dedo se desliza. Teclado: ← → Inicio Fin, y solo el elegido entra en el orden de Tab.
        </p>
        <Demo>
          <Tabs label="Nivel principal" size="base" value={seccionBase} onChange={setSeccionBase} tabs={[{ key: "torneos", label: "Torneos" }, { key: "temporadas", label: "Temporadas" }]} />
        </Demo>
        <p className="font-body text-xs text-text-secondary">
          <code className="rounded bg-brand-300 px-1">size=&quot;base&quot;</code>: 16 px para el nivel principal (por omisión, 14 px).
        </p>
        <Demo>
          <Tabs
            label="Secciones de la convocatoria"
            value={conPendientes}
            onChange={setConPendientes}
            tabs={[{ key: "torneo", label: "Torneo" }, { key: "solicitudes", label: "Solicitudes", count: 3 }, { key: "equipos", label: "Equipos" }]}
            trailing={<span className="shrink-0 rounded-lg border border-border-primary px-3 py-2 font-body text-sm font-bold text-text-primary">Acciones</span>}
          />
        </Demo>
        <p className="font-body text-xs text-text-secondary">
          <code className="rounded bg-brand-300 px-1">count</code> pinta la bolita de pendientes y <code className="rounded bg-brand-300 px-1">trailing</code> deja acciones que no son tabs siempre a la vista.
        </p>
      </Section>

      <Section title="Segmentado (segmented)">
        <Demo>
          <Tabs variant="segmented" label="Estado de los partidos" value={estado} onChange={setEstado} tabs={estados} />
        </Demo>
      </Section>

      <Section title="Filtros (filters)">
        <Demo>
          <Tabs variant="filters" label="Torneo" value={filtro} onChange={setFiltro} tabs={filtros} />
        </Demo>
        <p className="font-body text-xs text-text-secondary">Misma píldora, pero como botones de activar y desactivar (aria-pressed); <code className="rounded bg-brand-300 px-1">leading</code> pone un indicador antes del nombre.</p>
      </Section>

      <Section title="Landing (landing)">
        <div className="lc rounded-xl p-4">
          <Tabs
            variant="landing"
            label="La plataforma por rol"
            idPrefix="ds-rol"
            panelId="ds-rol-panel"
            value={rol}
            onChange={setRol}
            tabs={roles}
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          />
          <div id="ds-rol-panel" role="tabpanel" aria-labelledby={`ds-rol-${roles.findIndex((r) => r.key === rol)}`} className="sr-only">
            {rol}
          </div>
        </div>
      </Section>

      <section className="mt-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">Medidas</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border-primary bg-surface-primary">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-primary text-[10px] uppercase tracking-wider text-text-secondary">
                <th className="px-4 py-2.5 font-medium">Propiedad</th>
                <th className="px-4 py-2.5 font-medium">Valor</th>
                <th className="px-4 py-2.5 font-medium">Ámbito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary text-xs">
              {[
                ["Letra", "DM Sans, negrita", "todos"],
                ["Tamaño", "14 px (16 px con size=\"base\")", "todos"],
                ["Píldora", "alto mínimo 44 px, px-4, radio 8", "todos"],
                ["Segmentado", "alto 40 px por opción, pista con radio 12", "todos"],
              ].map(([prop, val, ambito]) => (
                <tr key={prop}>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{prop}</td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{val}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{ambito}</td>
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

function Demo({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border-primary bg-surface-primary p-4">{children}</div>;
}
