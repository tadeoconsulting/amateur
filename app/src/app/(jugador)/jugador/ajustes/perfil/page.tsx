"use client";

import Link from "next/link";
import { getUser, type UserDetail } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";

/** Años cumplidos a partir de la fecha de nacimiento (UTC, sin horas: coincide con cómo se
 * guarda — ver ajustes/perfil/editar). null si todavía no la cargó. */
function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday = now.getUTCMonth() < b.getUTCMonth() || (now.getUTCMonth() === b.getUTCMonth() && now.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

type PlayerStatsRow = UserDetail["playerProfiles"][number]["stats"][number];

function sumStats(stats: PlayerStatsRow[]) {
  return stats.reduce(
    (acc, s) => ({
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
      yellowCards: acc.yellowCards + s.yellowCards,
      redCards: acc.redCards + s.redCards,
      matchesPlayed: acc.matchesPlayed + s.matchesPlayed,
    }),
    { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0 }
  );
}

function StatTile({ label, value, accent, card }: { label: string; value: number; accent?: string; card?: "amarilla" | "roja" }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border-primary py-3">
      <div className="flex items-center gap-1.5">
        {/* Mismo swatch de tarjeta que usa el timeline del partido (bg-yellow/bg-red),
         * en vez de pintar el número: el amarillo de marca es muy claro para texto. */}
        {card && (
          <span className={`h-3.5 w-2.5 rounded-[2px] ${card === "amarilla" ? "bg-yellow" : "bg-red"}`} aria-hidden />
        )}
        <span className="font-heading text-2xl font-bold" style={accent ? { color: accent } : undefined}>
          {value}
        </span>
      </div>
      <span className="mt-0.5 text-center text-[11px] leading-tight text-text-secondary">{label}</span>
    </div>
  );
}

function ClubBadge({ club }: { club: { name: string; shortName: string; color: string | null; logoUrl: string | null } }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: (club.color || "#E5E7EB") + "20" }}
    >
      <span className="font-heading text-[11px] font-bold" style={{ color: club.color || "#6B7280" }}>
        {club.shortName}
      </span>
    </div>
  );
}

function JugadorPerfilContent({ userId }: { userId: string }) {
  const { data: user, loading } = useApi(() => getUser(userId));

  if (loading || !user) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Una ficha por club donde juega: las estadísticas son todas las suyas (sumando sus equipos) y el
  // dorsal y la posición son los del equipo con el que sale hoy.
  const profiles = user.playerProfiles;
  const clubs = profiles.flatMap((p) => (p.club ? [p.club] : []));
  const profile = profiles.find((p) => p.club?.id === user.activeClubId) ?? profiles[0] ?? null;
  const age = ageFromBirthDate(user.birthDate);
  const stats = profiles.flatMap((p) => p.stats);
  const totals = sumStats(stats);
  const hasStats = stats.length > 0;

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-heading text-xl font-bold text-text-primary">Mi Perfil</h1>
        <Link href="/jugador/ajustes/perfil/editar" className="p-1 text-text-primary" aria-label="Editar perfil">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {/* Tarjeta de jugador: foto, nombre, posición/dorsal, club, edad */}
      <div className="mt-4 flex flex-col items-center px-4 text-center">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-200">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa (Vercel Blob), no un asset local
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <h2 className="mt-3 font-heading text-lg font-bold text-text-primary">
          {user.firstName} {user.lastName}
        </h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          {[profile?.position, profile?.number ? `Dorsal ${profile.number}` : null, age !== null ? `${age} años` : null]
            .filter(Boolean)
            .join(" · ") || "Completa tu posición y fecha de nacimiento"}
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {clubs.length > 0 ? (
            clubs.map((club) => (
              <div key={club.id} className="flex items-center gap-2 rounded-full border border-border-primary py-1 pl-1 pr-3">
                <ClubBadge club={club} />
                <span className="font-body text-sm text-text-primary">{club.name}</span>
              </div>
            ))
          ) : (
            <Link
              href="/jugador/equipos/buscar"
              className="rounded-full border border-dashed border-border-primary px-3 py-1.5 font-body text-xs text-text-secondary hover:bg-btn-regular"
            >
              Sin equipo · Buscar equipos
            </Link>
          )}
        </div>
      </div>

      {/* Estadísticas: totales de carrera, sumando todos los torneos jugados */}
      <div className="mt-8 px-4">
        <h3 className="font-heading text-sm font-bold text-text-primary">Estadísticas</h3>

        {hasStats ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <StatTile label="Partidos jugados" value={totals.matchesPlayed} />
              <StatTile label="Goles" value={totals.goals} accent="var(--color-field-dark)" />
              <StatTile label="Asistencias" value={totals.assists} />
              <StatTile label="Tarjetas amarillas" value={totals.yellowCards} card="amarilla" />
              <StatTile label="Tarjetas rojas" value={totals.redCards} card="roja" />
              <StatTile label="Torneos" value={stats.length} />
            </div>

            {/* Desglose por torneo — un jugador puede haber jugado en varios */}
            <div className="mt-6">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wide text-text-secondary">Por torneo</h4>
              <div className="mt-2 overflow-hidden rounded-xl border border-border-primary">
                <table className="w-full text-left font-body text-xs">
                  <thead>
                    <tr className="border-b border-border-primary bg-btn-regular">
                      <th className="px-3 py-2 font-heading text-[10px] font-semibold text-text-secondary">Torneo</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">PJ</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">G</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">A</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">TA</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">TR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr key={s.tournament.id} className="border-b border-border-primary last:border-0">
                        <td className="truncate px-3 py-2.5 font-medium text-text-primary">{s.tournament.name}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{s.matchesPlayed}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{s.goals}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{s.assists}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{s.yellowCards}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{s.redCards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-xl border border-border-primary px-4 py-8 text-center">
            <p className="font-body text-sm text-text-secondary">
              {clubs.length > 0
                ? "Todavía no tienes estadísticas. En cuanto tu club te convoque a un torneo, tus goles y tarjetas van a aparecer acá."
                : "Únete a un equipo para empezar a sumar goles, tarjetas y partidos jugados."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JugadorPerfilPage() {
  const { user, loading: loadingAuth } = useAuth();

  if (loadingAuth || !user) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // `key` fuerza a remontar si el usuario cambia, así el useApi de adentro no se queda
  // pegado al id anterior (mismo patrón que club/equipo, club/torneos, buscar equipos).
  return <JugadorPerfilContent key={user.id} userId={user.id} />;
}
