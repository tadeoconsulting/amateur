import { LandingShell } from "./(landing)/_components/landing-shell";

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  // El proxy manda acá con ?auth=login&next=/ruta cuando se intenta entrar a una página protegida.
  const { auth, next } = await searchParams;
  const initialAuth = auth === "login" || auth === "register" ? auth : undefined;

  return <LandingShell initialAuth={initialAuth} next={typeof next === "string" ? next : null} />;
}
