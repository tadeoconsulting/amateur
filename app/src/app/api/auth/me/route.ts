import { getCurrentUser } from "@/_lib/auth";

// 200 con user: null cuando no hay sesión, para que el cliente pueda preguntar
// al cargar sin que aparezca un error en la consola del navegador.
export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
