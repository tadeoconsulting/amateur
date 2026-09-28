import { redirect } from "next/navigation";

// "Mis torneos" (con sus filtros) ahora vive directo en /torneos, que es la pantalla de
// inicio del organizador. Este redirect evita romper links o marcadores viejos.
export default function TorneosTodosRedirect() {
  redirect("/torneos");
}
