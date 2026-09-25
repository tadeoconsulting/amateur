import { Role } from "@prisma/client";

// Perfiles que una persona puede activar por su cuenta (al registrarse o desde "seleccion-perfil").
// ADMIN nunca se asigna por acá: solo lo otorga otro admin (PATCH /api/users/:id).
export const SELF_ASSIGNABLE_ROLES: Role[] = [Role.ORGANIZADOR, Role.CLUB_OWNER, Role.JUGADOR];
