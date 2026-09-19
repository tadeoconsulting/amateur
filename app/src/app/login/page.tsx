import { redirect } from "next/navigation";

// El inicio de sesión vive en el modal de la landing (con contraseña y sesión real).
// Esta ruta queda para los enlaces que ya apuntaban a /login.
export default function LoginPage() {
  redirect("/?auth=login");
}
