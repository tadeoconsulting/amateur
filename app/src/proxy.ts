import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/_lib/session";

// Redirección optimista: si no hay una sesión válida, manda a iniciar sesión.
// Es solo comodidad de navegación. La seguridad real está en los route handlers
// de /api, que validan la sesión y los permisos en cada request.

// Páginas dentro de estas rutas que siguen siendo públicas: la invitación de un club y la
// convocatoria de un torneo las abre alguien que todavía no tiene cuenta.
const PUBLIC_PATHS = ["/jugador/invitacion", "/convocatoria"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const userId = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (userId) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("auth", "login");
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/torneos/:path*",
    "/dashboard/:path*",
    "/jugadores/:path*",
    "/ajustes/:path*",
    "/partidos/:path*",
    "/notificaciones/:path*",
    "/crear-torneo/:path*",
    "/seleccion-perfil",
    "/club/:path*",
    "/jugador/:path*",
    "/admin/:path*",
  ],
};
