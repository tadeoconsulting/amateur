import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";
import { paragraphsOf, type ContentSection } from "@/_lib/content";

/**
 * Un documento legal público (Términos, Políticas): el título y sus secciones. Una sección con título lo muestra en
 * negrita antes de su primer párrafo; una sin título es un párrafo suelto (la apertura). Solo texto: nada de lo que
 * escribe el admin se interpreta como HTML.
 */
export function LegalDocument({ title, sections }: { title: string; sections: ContentSection[] }) {
  return (
    <MobileShell>
      <BackHeader />
      <section className="px-4 pt-4 pb-10">
        <h1 className="font-heading text-xl font-bold text-text-primary">{title}</h1>

        <div className="mt-6 space-y-4 font-body text-sm leading-relaxed text-text-secondary">
          {sections.map((s, i) =>
            paragraphsOf(s.body).map((p, j) => (
              <p key={`${i}-${j}`} className="whitespace-pre-line">
                {j === 0 && s.title && (
                  <>
                    <strong className="text-text-primary">{s.title}</strong>{" "}
                  </>
                )}
                {p}
              </p>
            ))
          )}
        </div>
      </section>
    </MobileShell>
  );
}
