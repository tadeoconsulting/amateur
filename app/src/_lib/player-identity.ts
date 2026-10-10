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

// ─── Cómo se ve el nombre de un jugador en lo público ──────────────────────
// Un menor de 18 no se publica con su nombre completo: sale su primer nombre y la inicial de su primer apellido
// ("Luigui Emmanuel Flores Medina" → "Luigui F."). Lo ven completo quienes gestionan al jugador: un admin, el
// organizador del torneo y el delegado de su club. Un jugador sin fecha de nacimiento se trata como adulto: no hay
// cómo saber otra cosa.

/** ¿Es menor de 18 a la fecha `today` (YYYY-MM-DD)? Sin fecha de nacimiento, no. */
export function isMinorOn(birthDate: Date | string | null | undefined, today: string): boolean {
  if (!birthDate) return false;
  const iso = typeof birthDate === "string" ? birthDate.slice(0, 10) : birthDate.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [by, bm, bd] = iso.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0) < 18;
}

/** El nombre que sale en una pantalla pública: completo, o abreviado si es menor y quien mira no lo gestiona. */
export function publicName(who: { firstName: string; lastName: string }, hide: boolean): string {
  if (!hide) return fullName(who);
  const first = who.firstName.trim().split(/\s+/)[0] ?? "";
  const initial = who.lastName.trim().charAt(0).toUpperCase();
  return [first, initial ? `${initial}.` : ""].filter(Boolean).join(" ");
}
