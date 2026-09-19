"use client";

import { BackHeader } from "@/_components/back-header";
import { MobileShell } from "@/_components/mobile-shell";

export default function NavigationPage() {
  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Components
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Navigation
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Componentes de navegacion y layout reutilizables.
          Importados desde <code className="rounded bg-brand-300 px-1 text-xs">@/_components/</code>.
          Usados en todas las pantallas mobile.
        </p>
      </header>

      {/* BackHeader */}
      <Section title="BackHeader">
        <div className="rounded-xl border border-brand-200 bg-white">
          <p className="px-6 pt-4 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Interactivo — click para probar (no navega en este contexto)
          </p>
          <BackHeader onBack={() => {}} />
        </div>
        <CodeRef
          component="BackHeader"
          path="@/_components/back-header.tsx"
          props={["onBack?: () => void  // default: window.history.back()"]}
        />
        <div className="mt-3 rounded-lg border border-brand-200 bg-brand-100 p-4 text-xs text-text-secondary">
          <p className="font-medium text-text-primary">Uso en pantallas:</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li>/onboarding — onBack personalizado (slide anterior o history.back)</li>
            <li>/login — default history.back</li>
            <li>/ayuda — default history.back</li>
            <li>/terminos — default history.back</li>
            <li>/privacidad — default history.back</li>
          </ul>
        </div>
      </Section>

      {/* MobileShell */}
      <Section title="MobileShell">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Preview — contenedor mobile centrado a 430px
          </p>
          <div className="mx-auto max-w-[430px] rounded border-2 border-dashed border-brand-300 bg-surface-primary p-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <line x1="8" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              max-w-[430px] &middot; min-h-dvh &middot; bg-surface-primary
            </div>
            <p className="mt-2 font-body text-xs text-text-secondary">
              Wrapper que centra el contenido mobile y establece el fondo. Todas las pantallas auth/legal lo usan.
            </p>
          </div>
        </div>
        <CodeRef
          component="MobileShell"
          path="@/_components/mobile-shell.tsx"
          props={["children: React.ReactNode"]}
        />
      </Section>

      {/* Pattern */}
      <Section title="Patron completo">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Estructura basica de una pantalla mobile
          </p>
          <div className="rounded-lg bg-brand-900 p-4 text-xs text-brand-200 font-mono overflow-x-auto">
            <p className="text-brand-500">{"// Patron reutilizado en 5 pantallas"}</p>
            <p>{`import { MobileShell } from "@/_components/mobile-shell";`}</p>
            <p>{`import { BackHeader } from "@/_components/back-header";`}</p>
            <p className="mt-2">{`export default function Page() {`}</p>
            <p>{`  return (`}</p>
            <p>{`    <MobileShell>`}</p>
            <p>{`      <BackHeader />`}</p>
            <p>{`      <section className="px-4 pt-4">`}</p>
            <p>{`        {/* contenido */}`}</p>
            <p>{`      </section>`}</p>
            <p>{`    </MobileShell>`}</p>
            <p>{`  );`}</p>
            <p>{`}`}</p>
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
                <th className="px-4 py-2.5 font-medium">Componente</th>
                <th className="px-4 py-2.5 font-medium">Archivo</th>
                <th className="px-4 py-2.5 font-medium">Usado en</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-200 text-xs">
              {[
                ["MobileShell", "mobile-shell.tsx", "5 pantallas"],
                ["BackHeader", "back-header.tsx", "5 pantallas"],
                ["Accordion", "accordion.tsx", "/ayuda"],
                ["CategoryTabs", "category-tabs.tsx", "/ayuda"],
              ].map(([comp, file, used]) => (
                <tr key={comp}>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{comp}</td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{file}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{used}</td>
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
      <p className="text-brand-500">// Import</p>
      <p>{`import { ${component} } from "${path}";`}</p>
      <p className="mt-2 text-brand-500">// Props</p>
      {props.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
