// Asignar una cuenta a un jugador provisional (especificación 009, entrega 2). Pura y sin dependencias: la usan
// la ruta `POST /api/players/:id/link` y las pruebas.
//
// Dos casos, según la cuenta:
//  - "link": la cuenta no tiene ficha en el equipo del provisional ni una ficha libre → el perfil provisional
//    pasa a ser la ficha de esa cuenta (se le pone el `userId`). Es el mismo perfil: no se pierde nada.
//  - "merge": la cuenta YA tiene ficha en ese equipo (o una libre, sin equipo) → no puede haber dos: las
//    jugadas, alineaciones y estadísticas del provisional pasan a la ficha de la cuenta, y el provisional se elimina.
//
// Nunca se pisa un dato de la cuenta: si el DNI o la fecha de nacimiento difieren, se avisa y se queda el de la cuenta.

export type LinkAccount = {
  id: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  /** YYYY-MM-DD */
  birthDate: string | null;
  isAdmin: boolean;
  hasPlayerRole: boolean;
  profiles: { id: string; clubId: string | null; position: string | null; number: number | null; categoryId: string | null }[];
};

export type LinkProvisional = {
  clubId: string;
  firstName: string;
  lastName: string;
  dni: string;
  /** YYYY-MM-DD */
  birthDate: string | null;
  position: string | null;
  number: number | null;
  categoryId: string | null;
};

/** Qué se le completa a la ficha que se queda (solo lo que ahí está vacío). */
export type ProfileFill = { clubId?: string; position?: string; number?: number; categoryId?: string };
/** Qué se le completa a la cuenta (solo lo que ahí está vacío). */
export type AccountFill = { dni?: string; birthDate?: string };

export type LinkPlan =
  | { ok: false; reason: string }
  | {
      ok: true;
      mode: "link" | "merge";
      /** La ficha de la cuenta que recibe todo (solo en "merge"). */
      targetProfileId: string | null;
      profileFill: ProfileFill;
      accountFill: AccountFill;
      grantPlayerRole: boolean;
      warnings: string[];
    };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function planLink(prov: LinkProvisional, account: LinkAccount): LinkPlan {
  if (account.isAdmin) return { ok: false, reason: "Una cuenta de administrador no puede ser jugadora" };

  const target = account.profiles.find((p) => p.clubId === prov.clubId) ?? account.profiles.find((p) => p.clubId === null) ?? null;
  const warnings: string[] = [];

  if (norm(`${account.firstName} ${account.lastName}`) !== norm(`${prov.firstName} ${prov.lastName}`)) {
    warnings.push(`El nombre de la cuenta (${account.firstName} ${account.lastName}) es distinto al del provisional (${prov.firstName} ${prov.lastName}): desde ahora se mostrará el de la cuenta.`);
  }
  if (account.dni && account.dni !== prov.dni) {
    warnings.push(`El DNI de la cuenta (${account.dni}) es distinto al del provisional (${prov.dni}): se conserva el de la cuenta.`);
  }
  if (account.birthDate && prov.birthDate && account.birthDate !== prov.birthDate) {
    warnings.push(`La fecha de nacimiento de la cuenta (${account.birthDate}) es distinta a la del provisional (${prov.birthDate}): se conserva la de la cuenta.`);
  }

  const accountFill: AccountFill = {};
  if (!account.dni) accountFill.dni = prov.dni;
  if (!account.birthDate && prov.birthDate) accountFill.birthDate = prov.birthDate;

  const profileFill: ProfileFill = {};
  if (target) {
    if (target.clubId === null) {
      profileFill.clubId = prov.clubId;
      warnings.push("La cuenta tenía una ficha sin equipo: pasa a ser la de este equipo.");
    }
    if (!target.position && prov.position) profileFill.position = prov.position;
    if (target.number == null && prov.number != null) profileFill.number = prov.number;
    if (!target.categoryId && prov.categoryId) profileFill.categoryId = prov.categoryId;
  }

  return {
    ok: true,
    mode: target ? "merge" : "link",
    targetProfileId: target?.id ?? null,
    profileFill,
    accountFill,
    grantPlayerRole: !account.hasPlayerRole,
    warnings,
  };
}

export type Stats = { goals: number; assists: number; yellowCards: number; redCards: number; matchesPlayed: number };

/** Suma las estadísticas de dos fichas del mismo torneo (al unir perfiles). */
export function sumStats(a: Stats, b: Stats): Stats {
  return {
    goals: a.goals + b.goals,
    assists: a.assists + b.assists,
    yellowCards: a.yellowCards + b.yellowCards,
    redCards: a.redCards + b.redCards,
    matchesPlayed: a.matchesPlayed + b.matchesPlayed,
  };
}
