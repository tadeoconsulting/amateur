import { prisma } from "@/_lib/prisma";
import { requireRole } from "@/_lib/auth";
import { kindFromSlug, validateSections } from "@/_lib/content";
import { getContent } from "@/_lib/content-server";

type Ctx = { params: Promise<{ kind: string }> };

/**
 * El contenido editable de la plataforma (especificación 016): Centro de ayuda, Términos y Políticas. Solo un admin.
 * `:kind` es `ayuda`, `terminos` o `politicas`.
 */

/** Las secciones guardadas del tipo; si no hay ninguna, el texto de respaldo (`usingDefaults`) para precargar el editor. */
export async function GET(_req: Request, { params }: Ctx) {
  // Sin roles en la lista: solo pasa un ADMIN.
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const kind = kindFromSlug((await params).kind);
  if (!kind) return Response.json({ error: "Tipo de contenido no encontrado" }, { status: 404 });

  return Response.json(await getContent(kind));
}

/** Reemplaza todas las secciones del tipo por las enviadas, en una transacción. La lista vacía vuelve al texto de respaldo. */
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const kind = kindFromSlug((await params).kind);
  if (!kind) return Response.json({ error: "Tipo de contenido no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const result = validateSections(kind, body?.sections);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  await prisma.$transaction([
    prisma.contentItem.deleteMany({ where: { kind } }),
    prisma.contentItem.createMany({
      data: result.sections.map((s, position) => ({ kind, position, category: s.category, title: s.title, body: s.body, updatedById: auth.user.id })),
    }),
  ]);

  return Response.json(await getContent(kind));
}
