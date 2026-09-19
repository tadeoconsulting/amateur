export default function DesignSystemOverview() {
  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Crono Design System
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Overview
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Crono DS es el sistema de diseño de Amateur, la plataforma de gestión
          de torneos de fútbol amateur. Define los fundamentos visuales —color,
          tipografía, espaciado— y los componentes reutilizables que garantizan
          coherencia en toda la experiencia.
        </p>
      </header>

      {/* Naming */}
      <section className="mb-12">
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Naming
        </h2>
        <div className="mt-4 rounded-xl border border-brand-200 bg-white p-6">
          <p className="font-heading text-2xl font-bold text-text-primary">
            Crono
          </p>
          <p className="mt-2 font-body text-sm leading-relaxed text-text-secondary">
            <strong className="text-text-primary">Mide TODO:</strong> tiempo,
            esfuerzo, resultados.
          </p>
          <p className="mt-3 font-body text-sm leading-relaxed text-text-secondary">
            Todo deporte tiene una meta (línea de llegada, objetivo, resultado).
            Corto, memorable, funciona igual en running que en fútbol o
            ciclismo.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="mb-12">
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Principios
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Neutral por default",
              desc: "Paleta en blanco/negro/gris. El color se reserva para estados y acciones que requieren atención.",
            },
            {
              title: "Mobile-first",
              desc: "Cada componente y decisión de layout prioriza la experiencia en dispositivos móviles.",
            },
            {
              title: "Tipografía clara",
              desc: "Tres familias con roles definidos: headings, body y UI sans. Sin ambigüedades.",
            },
            {
              title: "Tokens semánticos",
              desc: "Los colores se nombran por su función (text-primary, surface, btn-primary), no por su valor.",
            },
          ].map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-brand-200 bg-white p-5"
            >
              <h3 className="font-heading text-sm font-semibold text-text-primary">
                {p.title}
              </h3>
              <p className="mt-1.5 font-body text-sm leading-relaxed text-text-secondary">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Secciones
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              href: "/design-system/color",
              label: "Color",
              desc: "Primitivas y tokens semánticos",
            },
            {
              href: "/design-system/typography",
              label: "Typography",
              desc: "Familias, pesos y escalas",
            },
            {
              href: "/design-system/tokens",
              label: "Tokens",
              desc: "Referencia completa de variables",
            },
            {
              href: "/design-system/buttons",
              label: "Buttons",
              desc: "Primary, secondary, icon, link, filtros",
            },
            {
              href: "/design-system/inputs",
              label: "Inputs y selection",
              desc: "Text fields, selects, switches, radios",
            },
            {
              href: "/design-system/accordion",
              label: "Accordion",
              desc: "FAQ expandible y category tabs",
            },
            {
              href: "/design-system/navigation",
              label: "Navigation",
              desc: "BackHeader, MobileShell y patrones",
            },
            {
              href: "/design-system/tournament",
              label: "Tournament",
              desc: "Header, standings, match cards, timeline",
            },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-brand-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <h3 className="font-heading text-sm font-semibold text-text-primary group-hover:underline">
                {link.label}
              </h3>
              <p className="mt-1 text-xs text-text-secondary">{link.desc}</p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
