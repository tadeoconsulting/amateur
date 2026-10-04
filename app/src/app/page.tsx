import { LandingShell } from "./(landing)/_components/landing-shell";
import { PROFILE_ROLES } from "@/_lib/profiles";

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  // El proxy manda acá con ?auth=login&next=/ruta cuando se intenta entrar a una página protegida.
  const { auth, next, rol } = await searchParams;
  const initialAuth = auth === "login" || auth === "register" ? auth : undefined;

  // ?rol=CLUB_OWNER deja elegido ese perfil en el registro (la convocatoria de un torneo lo usa:
  // quien llega a pedir unirse viene a registrar un equipo).
  const initialRoles = PROFILE_ROLES.filter((p) => p.role === rol).map((p) => p.role);

  return <LandingShell initialAuth={initialAuth} next={typeof next === "string" ? next : null} initialRoles={initialRoles} />;
}
