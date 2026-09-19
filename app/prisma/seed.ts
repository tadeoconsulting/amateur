import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.matchEvent.deleteMany();
  await prisma.match.deleteMany();
  await prisma.playerStats.deleteMany();
  await prisma.playerInvitation.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.tournamentTeam.deleteMany();
  await prisma.teamCategory.deleteMany();
  await prisma.staffMember.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.club.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ──────────────────────────────────────────────────

  const organizer = await prisma.user.create({
    data: {
      id: "user-org-1",
      email: "organizador@amateur.pe",
      passwordHash: "$2b$10$placeholder",
      firstName: "Israel",
      lastName: "Lara",
      phone: "945648774",
      roles: { create: [{ role: "ORGANIZADOR" }] },
    },
  });

  const clubOwner1 = await prisma.user.create({
    data: {
      id: "user-club-1",
      email: "club1@amateur.pe",
      passwordHash: "$2b$10$placeholder",
      firstName: "Jorge",
      lastName: "Mendez",
      phone: "987654321",
      roles: { create: [{ role: "CLUB_OWNER" }] },
    },
  });

  const clubOwner2 = await prisma.user.create({
    data: {
      id: "user-club-2",
      email: "club2@amateur.pe",
      passwordHash: "$2b$10$placeholder",
      firstName: "Carlos",
      lastName: "Torres",
      phone: "912345678",
      roles: { create: [{ role: "CLUB_OWNER" }] },
    },
  });

  const playerUsers = await Promise.all(
    [
      { id: "user-p1", email: "carlos.mendez@mail.com", firstName: "Carlos", lastName: "Mendez", gender: "masculino" },
      { id: "user-p2", email: "lucas.torres@mail.com", firstName: "Lucas", lastName: "Torres", gender: "masculino" },
      { id: "user-p3", email: "angel.rodriguez@mail.com", firstName: "Angel", lastName: "Rodriguez", gender: "masculino" },
      { id: "user-p4", email: "diego.fernandez@mail.com", firstName: "Diego", lastName: "Fernandez", gender: "masculino" },
      { id: "user-p5", email: "andres.lopez@mail.com", firstName: "Andres", lastName: "Lopez", gender: "masculino" },
      { id: "user-p6", email: "andres.espinel@mail.com", firstName: "Andres", lastName: "Espinel", gender: "masculino" },
      { id: "user-p7", email: "aldo.shimabukuro@mail.com", firstName: "Aldo", lastName: "Shimabukuro", gender: "masculino" },
      { id: "user-p8", email: "ram.beautis@mail.com", firstName: "Ram", lastName: "Beautis", gender: "masculino" },
      { id: "user-p9", email: "roberto.campos@mail.com", firstName: "Roberto", lastName: "Campos", gender: "masculino" },
      { id: "user-p10", email: "felipe.vargas@mail.com", firstName: "Felipe", lastName: "Vargas", gender: "masculino" },
      { id: "user-p11", email: "nicolas.paredes@mail.com", firstName: "Nicolas", lastName: "Paredes", gender: "masculino" },
      { id: "user-p12", email: "santiago.morales@mail.com", firstName: "Santiago", lastName: "Morales", gender: "masculino" },
    ].map((u) =>
      prisma.user.create({
        data: {
          ...u,
          passwordHash: "$2b$10$placeholder",
          roles: { create: [{ role: "JUGADOR" }] },
        },
      })
    )
  );

  // ─── Clubs ──────────────────────────────────────────────────

  const clubs = await Promise.all([
    prisma.club.create({ data: { id: "club-1", name: "Deportivo Union", shortName: "UNI", ownerId: clubOwner1.id } }),
    prisma.club.create({ data: { id: "club-2", name: "Atletico San Martin", shortName: "ASM", ownerId: clubOwner2.id } }),
    prisma.club.create({ data: { id: "club-3", name: "Club Social Rivera", shortName: "RIV", ownerId: clubOwner1.id } }),
    prisma.club.create({ data: { id: "club-4", name: "Juventud del Norte", shortName: "JDN", ownerId: clubOwner2.id } }),
    prisma.club.create({ data: { id: "club-5", name: "Racing Barrio Sur", shortName: "RBS", ownerId: clubOwner1.id } }),
    prisma.club.create({ data: { id: "club-6", name: "Independiente FC", shortName: "IND", ownerId: clubOwner2.id } }),
    prisma.club.create({ data: { id: "club-7", name: "Defensores del Lago", shortName: "DEL", ownerId: clubOwner1.id } }),
    prisma.club.create({ data: { id: "club-8", name: "Sportivo Central", shortName: "SPC", ownerId: clubOwner2.id } }),
  ]);

  // ─── Categories ─────────────────────────────────────────────

  await prisma.teamCategory.createMany({
    data: [
      { id: "cat-sub15", name: "Sub 15", gender: "masculino", clubId: "club-1", ageType: "definir_edad", maxAge: 15 },
      { id: "cat-libre", name: "Libre", gender: "masculino", clubId: "club-1", ageType: "libre" },
      { id: "cat-master", name: "Master", gender: "masculino", clubId: "club-1", ageType: "master", minAge: 35 },
      { id: "cat-fem-sub15", name: "Sub 15", gender: "femenino", clubId: "club-1", ageType: "definir_edad", maxAge: 15 },
    ],
  });

  // ─── Staff ──────────────────────────────────────────────────

  await prisma.staffMember.createMany({
    data: [
      { id: "staff-1", role: "director_tecnico", userId: clubOwner1.id, clubId: "club-1" },
      { id: "staff-2", role: "delegado", userId: clubOwner1.id, clubId: "club-1" },
    ],
  });

  // ─── Player Profiles ───────────────────────────────────────

  const positions = ["Delantero", "Mediocampista", "Delantero", "Defensa central", "Portero", "Delantero", "Delantero", "Mediocampista", "Extremo", "Delantero", "Mediocampista", "Mediocampista"];
  const clubAssignments = ["club-1", "club-1", "club-1", "club-1", "club-1", "club-3", "club-4", "club-5", "club-5", "club-6", "club-7", "club-8"];
  const numbers = [9, 10, 7, 5, 1, 10, 9, 8, 7, 11, 8, 10];

  await Promise.all(
    playerUsers.map((u, i) =>
      prisma.playerProfile.create({
        data: {
          id: `profile-${i + 1}`,
          position: positions[i],
          number: numbers[i],
          userId: u.id,
          clubId: clubAssignments[i],
          categoryId: i < 5 ? "cat-sub15" : null,
        },
      })
    )
  );

  // ─── Tournament ─────────────────────────────────────────────

  const tournament = await prisma.tournament.create({
    data: {
      id: "torneo-1",
      name: "Copa Comunidad Futbol",
      format: "liga",
      status: "en_curso",
      maxTeams: 10,
      startDate: new Date("2026-07-15"),
      endDate: new Date("2026-09-30"),
      location: "Complejo Deportivo Municipal",
      category: "Sub 12",
      organizerId: organizer.id,
    },
  });

  const tournament2 = await prisma.tournament.create({
    data: {
      id: "torneo-2",
      name: "Torneo Apertura 2026",
      format: "grupos",
      status: "inscripcion",
      maxTeams: 16,
      minTeams: 8,
      startDate: new Date("2026-10-01"),
      location: "Canchas El Bosque",
      organizerId: organizer.id,
    },
  });

  // Enroll all 8 clubs in tournament 1
  await prisma.tournamentTeam.createMany({
    data: clubs.map((c, i) => ({
      tournamentId: "torneo-1",
      clubId: c.id,
      groupName: i < 4 ? "Grupo A" : "Grupo B",
    })),
  });

  // ─── Matches ────────────────────────────────────────────────

  const matchData = [
    { id: "match-1", homeId: "club-1", awayId: "club-2", homeScore: 3, awayScore: 0, status: "finalizado", date: "2026-06-30", time: "15:00", matchday: 1, group: "Grupo A" },
    { id: "match-2", homeId: "club-3", awayId: "club-4", homeScore: 2, awayScore: 1, status: "finalizado", date: "2026-06-30", time: "17:00", matchday: 1, group: "Grupo A" },
    { id: "match-3", homeId: "club-5", awayId: "club-6", homeScore: 1, awayScore: 1, status: "finalizado", date: "2026-07-06", time: "15:00", matchday: 2, group: "Grupo B" },
    { id: "match-4", homeId: "club-7", awayId: "club-8", homeScore: 0, awayScore: 2, status: "finalizado", date: "2026-07-06", time: "17:00", matchday: 2, group: "Grupo B" },
    { id: "match-5", homeId: "club-1", awayId: "club-3", homeScore: 2, awayScore: 2, status: "finalizado", date: "2026-07-13", time: "15:00", matchday: 3, group: "Grupo A" },
    { id: "match-6", homeId: "club-2", awayId: "club-5", homeScore: null, awayScore: null, status: "programado", date: "2026-09-07", time: "15:00", matchday: 4, group: "Grupo A" },
    { id: "match-7", homeId: "club-4", awayId: "club-6", homeScore: null, awayScore: null, status: "programado", date: "2026-09-07", time: "17:00", matchday: 4, group: "Grupo B" },
    { id: "match-8", homeId: "club-7", awayId: "club-1", homeScore: null, awayScore: null, status: "programado", date: "2026-09-14", time: "15:00", matchday: 5, group: "Grupo A" },
  ];

  await prisma.match.createMany({
    data: matchData.map((m) => ({
      id: m.id,
      tournamentId: "torneo-1",
      homeTeamId: m.homeId,
      awayTeamId: m.awayId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      date: new Date(m.date),
      time: m.time,
      location: "Complejo Deportivo Municipal",
      matchday: m.matchday,
      groupName: m.group,
    })),
  });

  // ─── Match Events ──────────────────────────────────────────

  await prisma.matchEvent.createMany({
    data: [
      { matchId: "match-1", type: "gol", minute: 15, playerId: "profile-3", teamId: "club-1" },
      { matchId: "match-1", type: "gol", minute: 32, playerId: "profile-3", teamId: "club-1" },
      { matchId: "match-1", type: "tarjeta_amarilla", minute: 40, playerId: "profile-4", teamId: "club-1" },
      { matchId: "match-1", type: "gol", minute: 70, playerId: "profile-1", teamId: "club-1" },
      { matchId: "match-2", type: "gol", minute: 22, playerId: "profile-6", teamId: "club-3" },
      { matchId: "match-2", type: "gol", minute: 55, playerId: "profile-6", teamId: "club-3" },
      { matchId: "match-2", type: "gol", minute: 78, playerId: "profile-7", teamId: "club-4" },
    ],
  });

  // ─── Player Stats ──────────────────────────────────────────

  await prisma.playerStats.createMany({
    data: [
      { playerId: "profile-1", tournamentId: "torneo-1", goals: 6, assists: 2, yellowCards: 1, redCards: 0, matchesPlayed: 5 },
      { playerId: "profile-2", tournamentId: "torneo-1", goals: 4, assists: 3, yellowCards: 0, redCards: 0, matchesPlayed: 5 },
      { playerId: "profile-3", tournamentId: "torneo-1", goals: 5, assists: 1, yellowCards: 2, redCards: 0, matchesPlayed: 5 },
      { playerId: "profile-4", tournamentId: "torneo-1", goals: 1, assists: 0, yellowCards: 3, redCards: 1, matchesPlayed: 5 },
      { playerId: "profile-5", tournamentId: "torneo-1", goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 5 },
      { playerId: "profile-6", tournamentId: "torneo-1", goals: 9, assists: 4, yellowCards: 0, redCards: 0, matchesPlayed: 5 },
      { playerId: "profile-7", tournamentId: "torneo-1", goals: 8, assists: 2, yellowCards: 1, redCards: 0, matchesPlayed: 5 },
      { playerId: "profile-8", tournamentId: "torneo-1", goals: 6, assists: 1, yellowCards: 0, redCards: 0, matchesPlayed: 5 },
      { playerId: "profile-9", tournamentId: "torneo-1", goals: 4, assists: 3, yellowCards: 0, redCards: 0, matchesPlayed: 5 },
      { playerId: "profile-10", tournamentId: "torneo-1", goals: 3, assists: 2, yellowCards: 1, redCards: 0, matchesPlayed: 4 },
      { playerId: "profile-11", tournamentId: "torneo-1", goals: 3, assists: 1, yellowCards: 0, redCards: 0, matchesPlayed: 5 },
      { playerId: "profile-12", tournamentId: "torneo-1", goals: 2, assists: 4, yellowCards: 0, redCards: 0, matchesPlayed: 5 },
    ],
  });

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
