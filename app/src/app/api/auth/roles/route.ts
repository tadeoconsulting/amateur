import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { badRequest, readJson, requireUser } from "@/_lib/auth";
import { SELF_ASSIGNABLE_ROLES } from "@/_lib/roles";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  const role = body?.role as Role | undefined;
  if (!role || !SELF_ASSIGNABLE_ROLES.includes(role)) {
    return badRequest("Rol no válido");
  }

  await prisma.userRole.upsert({
    where: { userId_role: { userId: auth.user.id, role } },
    update: {},
    create: { userId: auth.user.id, role },
  });

  const roles = await prisma.userRole.findMany({ where: { userId: auth.user.id }, select: { role: true } });
  return Response.json({ roles: roles.map((r) => r.role) });
}
