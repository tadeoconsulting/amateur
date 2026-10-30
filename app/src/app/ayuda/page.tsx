import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";
import { getContent } from "@/_lib/content-server";
import { HelpCenter } from "./_components/help-center";

// Las preguntas las edita el admin (Admin → Contenido, especificación 016): se leen en cada visita.
export const dynamic = "force-dynamic";

export const metadata = { title: "Centro de ayuda · Amateur" };

export default async function AyudaPage() {
  const { sections } = await getContent("AYUDA");
  return (
    <MobileShell>
      <BackHeader />
      <section className="px-4 pt-4">
        <h1 className="font-heading text-xl font-bold text-text-primary">Centro de ayuda</h1>
        <HelpCenter sections={sections} />
      </section>
    </MobileShell>
  );
}
