"use client";

import { TournamentHeader } from "@/_components/tournament-header";
import { CompactStandings } from "@/_components/compact-standings";
import { TournamentMatchCard } from "@/_components/tournament-match-card";
import { PlayerSanctionRow } from "@/_components/player-sanction-row";
import { PlayerListRow } from "@/_components/player-list-row";
import { MatchTimeline } from "@/_components/match-timeline";
import { TopScorerRow } from "@/_components/top-scorer-row";
import { tournaments, standings, matches, playerSanctions, matchEvents, players, clubs } from "@/_lib/mock-data";

export default function TournamentComponentsPage() {
  const tournament = tournaments[0];
  const finishedMatch = matches.find((m) => m.status === "finalizado")!;
  const scheduledMatch = matches.find((m) => m.status === "programado")!;
  const events = matchEvents.filter((e) => e.matchId === finishedMatch.id);

  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Components
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Tournament
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Componentes reutilizables para torneos, partidos y jugadores.
          Importados desde <code className="rounded bg-brand-300 px-1 text-xs">@/_components/</code>.
          Usados en las pantallas de detalle de torneo y partido.
        </p>
      </header>

      {/* TournamentHeader */}
      <Section title="TournamentHeader">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Card de informacion del torneo
          </p>
          <div className="mx-auto max-w-[430px]">
            <TournamentHeader tournament={tournament} />
          </div>
        </div>
        <CodeRef
          component="TournamentHeader"
          path="@/_components/tournament-header.tsx"
          props={["tournament: Tournament"]}
        />
      </Section>

      {/* CompactStandings */}
      <Section title="CompactStandings">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Tabla de posiciones compacta (top 3)
          </p>
          <div className="mx-auto max-w-[430px]">
            <CompactStandings rows={standings} onViewFull={() => {}} />
          </div>
        </div>
        <CodeRef
          component="CompactStandings"
          path="@/_components/compact-standings.tsx"
          props={["rows: StandingsRow[]", "onViewFull?: () => void"]}
        />
      </Section>

      {/* TournamentMatchCard */}
      <Section title="TournamentMatchCard">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Partido finalizado
          </p>
          <div className="mx-auto max-w-[430px]">
            <TournamentMatchCard match={finishedMatch} />
          </div>
          <p className="mb-3 mt-6 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Proximo partido con CTA
          </p>
          <div className="mx-auto max-w-[430px]">
            <TournamentMatchCard match={scheduledMatch} showDefineLineup />
          </div>
        </div>
        <CodeRef
          component="TournamentMatchCard"
          path="@/_components/tournament-match-card.tsx"
          props={["match: Match", "showDefineLineup?: boolean"]}
        />
      </Section>

      {/* PlayerSanctionRow */}
      <Section title="PlayerSanctionRow">
        <div className="rounded-xl border border-brand-200 bg-white">
          <p className="px-6 pt-4 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Estados: habilitado y suspendido
          </p>
          <div className="mx-auto max-w-[430px]">
            {playerSanctions.slice(0, 2).map((s) => (
              <PlayerSanctionRow key={s.id} sanction={s} />
            ))}
          </div>
        </div>
        <CodeRef
          component="PlayerSanctionRow"
          path="@/_components/player-sanction-row.tsx"
          props={["sanction: PlayerSanction"]}
        />
      </Section>

      {/* PlayerListRow */}
      <Section title="PlayerListRow">
        <div className="rounded-xl border border-brand-200 bg-white">
          <p className="px-6 pt-4 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Fila de jugador inscrito
          </p>
          <div className="mx-auto max-w-[430px]">
            <PlayerListRow name="Alfonso Franci" position="Back central" />
            <PlayerListRow name="Mohammed Hassan" position="Mediocampista" />
            <PlayerListRow name="Jaydon Korsgaard" position="Extremo" />
          </div>
        </div>
        <CodeRef
          component="PlayerListRow"
          path="@/_components/player-list-row.tsx"
          props={["name: string", "position: string"]}
        />
      </Section>

      {/* MatchTimeline */}
      <Section title="MatchTimeline">
        <div className="rounded-xl border border-brand-200 bg-white">
          <p className="px-6 pt-4 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Timeline de eventos (goles, tarjetas)
          </p>
          <div className="mx-auto max-w-[430px]">
            <MatchTimeline
              events={events}
              homeTeamId={finishedMatch.homeTeam.id}
              status="finalizado"
            />
          </div>
        </div>
        <CodeRef
          component="MatchTimeline"
          path="@/_components/match-timeline.tsx"
          props={[
            "events: MatchEvent[]",
            "homeTeamId: string",
            "status: MatchStatus",
          ]}
        />
      </Section>

      {/* TopScorerRow */}
      <Section title="TopScorerRow">
        <div className="rounded-xl border border-brand-200 bg-white">
          <p className="px-6 pt-4 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Primer lugar (featured) y posiciones regulares
          </p>
          <div className="mx-auto max-w-[430px]">
            {players
              .filter((p) => p.goals > 0)
              .sort((a, b) => b.goals - a.goals)
              .slice(0, 4)
              .map((p, i) => {
                const club = clubs.find((c) => c.id === p.clubId);
                return (
                  <TopScorerRow
                    key={p.id}
                    position={i + 1}
                    name={`${p.firstName} ${p.lastName}`}
                    club={club?.name ?? ""}
                    goals={p.goals}
                    featured={i === 0}
                  />
                );
              })}
          </div>
        </div>
        <CodeRef
          component="TopScorerRow"
          path="@/_components/top-scorer-row.tsx"
          props={[
            "position: number",
            "name: string",
            "club: string",
            "goals: number",
            "featured?: boolean",
          ]}
        />
      </Section>

      {/* Anatomy */}
      <section className="mt-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">Anatomia</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 text-[10px] text-text-secondary uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Componente</th>
                <th className="px-4 py-2.5 font-medium">Archivo</th>
                <th className="px-4 py-2.5 font-medium">Usado en</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-200 text-xs">
              {[
                ["TournamentHeader", "tournament-header.tsx", "/torneos/[id]"],
                ["CompactStandings", "compact-standings.tsx", "/torneos/[id]"],
                ["TournamentMatchCard", "tournament-match-card.tsx", "/torneos/[id]"],
                ["PlayerSanctionRow", "player-sanction-row.tsx", "/torneos/[id] (Amonestados)"],
                ["PlayerListRow", "player-list-row.tsx", "/torneos/[id] (Inscritos)"],
                ["MatchTimeline", "match-timeline.tsx", "/torneos/[id]/partidos/[matchId]"],
                ["TopScorerRow", "top-scorer-row.tsx", "/torneos/[id] (Goleadores)"],
              ].map(([comp, file, used]) => (
                <tr key={comp}>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{comp}</td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{file}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-heading text-xl font-bold text-text-primary">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function CodeRef({ component, path, props }: { component: string; path: string; props: string[] }) {
  return (
    <div className="mt-3 rounded-lg bg-brand-900 p-4 text-xs text-brand-200 font-mono overflow-x-auto">
      <p className="text-brand-500">{"// Import"}</p>
      <p>{`import { ${component} } from "${path}";`}</p>
      <p className="mt-2 text-brand-500">{"// Props"}</p>
      {props.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
