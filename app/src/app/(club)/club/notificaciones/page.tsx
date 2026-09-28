import { redirect } from "next/navigation";

// Las notificaciones reales del club (invitaciones de un organizador a un torneo) viven en la
// pestaña "Solicitudes" de /club/torneos — nunca existieron acá. Se deja el redirect para que
// el ícono de campana de "Equipo" y "Jugadores" (y cualquier link viejo) no den 404.
export default function ClubNotificacionesRedirect() {
  redirect("/club/torneos?tab=solicitudes");
}
