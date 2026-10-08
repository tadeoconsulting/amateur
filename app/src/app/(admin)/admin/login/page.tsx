import { AdminLoginForm } from "./admin-login-form";

// Entrada propia del panel de administración: cupamateur.com/admin/login. No tiene registro ni
// elección de perfil, y solo abre sesión a cuentas de administrador.
export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  return <AdminLoginForm next={typeof next === "string" ? next : null} />;
}
