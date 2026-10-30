import { LegalDocument } from "@/_components/legal-document";
import { getContent } from "@/_lib/content-server";

// El texto lo edita el admin (Admin → Contenido, especificación 016): se lee en cada visita.
export const dynamic = "force-dynamic";

export const metadata = { title: "Términos y condiciones · Amateur" };

export default async function TerminosPage() {
  const { sections } = await getContent("TERMINOS");
  return <LegalDocument title="Términos y condiciones" sections={sections} />;
}
