import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson, requireUser } from "@/_lib/auth";

// Sedes guardadas por quien tiene la sesión, para reutilizar entre torneos (decisión 10).
// Cada organizador ve solo las suyas — no es un catálogo compartido.
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const sedes = await prisma.sede.findMany({
    where: { organizerId: auth.user.id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(sedes);
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return badRequest("name requerido");
  }

  try {
    const sede = await prisma.sede.create({
      data: {
        organizerId: auth.user.id,
        name: body.name.trim(),
        city: typeof body.city === "string" && body.city ? body.city : null,
        address: typeof body.address === "string" && body.address ? body.address : null,
        reference: typeof body.reference === "string" && body.reference ? body.reference : null,
      },
    });
    return Response.json(sede, { status: 201 });
  } catch (error) {
    console.error("Create sede error:", error);
    return Response.json({ error: "Error al crear sede" }, { status: 500 });
  }
}
