export default function TypographyPage() {
  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Foundations
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Typography
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Tres familias tipográficas con roles definidos. Cada familia tiene un
          propósito claro para mantener jerarquía visual y legibilidad.
        </p>
      </header>

      {/* Font families */}
      <section className="mb-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Familias
        </h2>
        <div className="mt-6 space-y-6">
          {/* Lexend */}
          <div className="rounded-xl border border-brand-200 bg-white p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-heading text-lg font-bold text-text-primary">
                Lexend
              </h3>
              <code className="rounded bg-brand-300 px-2 py-0.5 text-xs text-text-secondary">
                font-heading
              </code>
            </div>
            <p className="mt-1 font-body text-sm text-text-secondary">
              Headings, botones, labels y enlaces. Diseñada para mejorar la
              velocidad de lectura.
            </p>
            <div className="mt-5 space-y-4 border-t border-brand-200 pt-5">
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wide">Bold — Headings</p>
                <p className="mt-1 font-heading text-2xl font-bold text-text-primary">
                  Gestiona tus torneos
                </p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wide">SemiBold — Buttons & Links</p>
                <p className="mt-1 font-heading text-base font-semibold text-text-primary">
                  Continuar con email
                </p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wide">Regular — Labels</p>
                <p className="mt-1 font-heading text-sm text-text-primary">
                  Términos y condiciones
                </p>
              </div>
            </div>
          </div>

          {/* Lato */}
          <div className="rounded-xl border border-brand-200 bg-white p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-heading text-lg font-bold text-text-primary">
                Lato
              </h3>
              <code className="rounded bg-brand-300 px-2 py-0.5 text-xs text-text-secondary">
                font-body
              </code>
            </div>
            <p className="mt-1 font-body text-sm text-text-secondary">
              Texto de cuerpo, párrafos y descripciones. Excelente legibilidad
              en bloques de texto largos.
            </p>
            <div className="mt-5 space-y-4 border-t border-brand-200 pt-5">
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wide">Regular — Body text</p>
                <p className="mt-1 font-body text-base leading-relaxed text-text-primary">
                  Registra tu organización en la comunidad futbolera y crea los
                  torneos futboleros más importantes de tu comunidad.
                </p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wide">Bold — Emphasis</p>
                <p className="mt-1 font-body text-base font-bold text-text-primary">
                  Inicia sesión o crea tu cuenta.
                </p>
              </div>
            </div>
          </div>

          {/* Inter */}
          <div className="rounded-xl border border-brand-200 bg-white p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-heading text-lg font-bold text-text-primary">
                Inter
              </h3>
              <code className="rounded bg-brand-300 px-2 py-0.5 text-xs text-text-secondary">
                font-sans
              </code>
            </div>
            <p className="mt-1 font-body text-sm text-text-secondary">
              UI sans-serif por default. Se usa como fallback base y para
              elementos de interfaz que no son heading ni body.
            </p>
            <div className="mt-5 space-y-4 border-t border-brand-200 pt-5">
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wide">Regular — UI elements</p>
                <p className="mt-1 font-sans text-sm text-text-primary">
                  PJ 10 &middot; G 7 &middot; E 2 &middot; P 1 &middot; Pts 23
                </p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wide">Medium — Table headers</p>
                <p className="mt-1 font-sans text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Equipo &nbsp; PJ &nbsp; G &nbsp; E &nbsp; P &nbsp; GF &nbsp; GC &nbsp; DG &nbsp; Pts
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scale */}
      <section className="mb-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Escala tipográfica
        </h2>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Tamaños utilizados en la aplicación, de mayor a menor.
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-brand-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 text-xs text-text-secondary uppercase">
                <th className="px-4 py-3 font-medium">Muestra</th>
                <th className="px-4 py-3 font-medium">Tamaño</th>
                <th className="px-4 py-3 font-medium">Familia</th>
                <th className="px-4 py-3 font-medium">Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-200">
              {[
                { size: "30px", family: "Lexend", weight: "Bold", use: "Page title (DS)", sample: "Crono DS" },
                { size: "22px", family: "Lexend", weight: "Bold", use: "Screen heading", sample: "Bienvenid@" },
                { size: "18px", family: "Lato", weight: "Regular", use: "Subtitle", sample: "Inicia sesión" },
                { size: "16px", family: "Lato", weight: "Regular", use: "Body", sample: "Registra tu organización" },
                { size: "14px", family: "Lexend", weight: "SemiBold", use: "Button / Link", sample: "Continuar con email" },
                { size: "12px", family: "Lexend", weight: "Regular", use: "Caption / Label", sample: "Términos y condiciones" },
                { size: "11px", family: "Inter", weight: "Medium", use: "Badge / Tag", sample: "En curso" },
              ].map((row) => (
                <tr key={row.size + row.use}>
                  <td className="px-4 py-3">
                    <span
                      className={`${
                        row.family === "Lexend"
                          ? "font-heading"
                          : row.family === "Lato"
                            ? "font-body"
                            : "font-sans"
                      } text-text-primary`}
                      style={{
                        fontSize: row.size,
                        fontWeight:
                          row.weight === "Bold"
                            ? 700
                            : row.weight === "SemiBold"
                              ? 600
                              : row.weight === "Medium"
                                ? 500
                                : 400,
                      }}
                    >
                      {row.sample}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                    {row.size}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {row.family} {row.weight}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {row.use}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CSS Variables */}
      <section>
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Variables CSS
        </h2>
        <div className="mt-4 rounded-xl border border-brand-200 bg-white divide-y divide-brand-200">
          {[
            { var: "--font-sans", value: "Inter", tw: "font-sans" },
            { var: "--font-heading", value: "Lexend", tw: "font-heading" },
            { var: "--font-body", value: "Lato", tw: "font-body" },
          ].map((v) => (
            <div key={v.var} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-mono text-sm text-text-primary">{v.var}</p>
                <p className="text-xs text-text-secondary">{v.value}</p>
              </div>
              <code className="rounded bg-brand-300 px-2 py-0.5 text-xs text-text-secondary">
                {v.tw}
              </code>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
