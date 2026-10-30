import { LegalDocument } from "@/_components/legal-document";
import { getContent } from "@/_lib/content-server";

// El texto lo edita el admin (Admin → Contenido, especificación 016): se lee en cada visita.
export const dynamic = "force-dynamic";

export const metadata = { title: "Políticas de privacidad · Amateur" };

export default async function PrivacidadPage() {
  const { sections } = await getContent("POLITICAS");
  return <LegalDocument title="Políticas de privacidad" sections={sections} />;
}
