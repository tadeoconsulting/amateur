import { prisma } from "@/_lib/prisma";
import type { ContentKind, ContentSection } from "./content";
import { DEFAULT_CONTENT } from "./content-defaults";

/**
 * Las secciones de un documento, en orden. Si el admin todavía no guardó ninguna, devuelve el texto de siempre
 * (`usingDefaults`), para que la página pública nunca quede vacía.
 */
export async function getContent(kind: ContentKind): Promise<{ sections: ContentSection[]; usingDefaults: boolean }> {
  const rows = await prisma.contentItem.findMany({
    where: { kind },
    orderBy: { position: "asc" },
    select: { category: true, title: true, body: true },
  });
  if (rows.length === 0) return { sections: DEFAULT_CONTENT[kind], usingDefaults: true };
  return { sections: rows, usingDefaults: false };
}
