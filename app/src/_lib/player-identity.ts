// Quién es un jugador, con o sin cuenta (especificación 009). Pura y sin dependencias: la usan las rutas de
// la API y las pruebas.
//
// Un jugador con cuenta toma su nombre de la cuenta (`user`). Un jugador *provisional* (cargado por un admin,
// sin cuenta) lo tiene en su propio perfil. Así el resto de la plataforma pide siempre "el nombre del
// jugador" y no necesita saber de cuál de los dos casos se trata.

type Named = { firstName: string; lastName: string; avatarUrl?: string | null; birthDate?: Date | string | null };

export type PlayerIdentityInput = {
  user: Named | null;
  firstName: string | null;
  lastName: string | null;
  birthDate?: Date | string | null;
};

export type PlayerIdentity = {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  birthDate: Date | string | null;
  /** true = sin cuenta todavía. */
  provisional: boolean;
};

export function playerIdentity(profile: PlayerIdentityInput): PlayerIdentity {
  if (profile.user) {
    return {
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      avatarUrl: profile.user.avatarUrl ?? null,
      birthDate: profile.user.birthDate ?? null,
      provisional: false,
    };
  }
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    avatarUrl: null,
    birthDate: profile.birthDate ?? null,
    provisional: true,
  };
}

/** "Apellidos, Nombres": el orden de las listas (se ordena en el código porque el nombre puede estar en dos tablas). */
export function compareByLastName(a: { lastName: string; firstName: string }, b: { lastName: string; firstName: string }) {
  return a.lastName.localeCompare(b.lastName, "es") || a.firstName.localeCompare(b.firstName, "es");
}

/** "Nombres Apellidos" para mostrar. */
export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}
