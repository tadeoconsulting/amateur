import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const stamp = Date.now();
const password = "Test1234!";

const org = await prisma.user.create({
  data: {
    email: `prodrev-org-${stamp}@test.amateur`,
    passwordHash: await bcrypt.hash(password, 10),
    firstName: "Prodrev",
    lastName: "Org",
    phone: "999999999",
    roles: { create: [{ role: "ORGANIZADOR" }] },
  },
});
const clubOwner = await prisma.user.create({
  data: {
    email: `prodrev-clubowner-${stamp}@test.amateur`,
    passwordHash: await bcrypt.hash(password, 10),
    firstName: "Prodrev",
    lastName: "ClubOwner",
    phone: "999999998",
    roles: { create: [{ role: "CLUB_OWNER" }] },
  },
});
const player = await prisma.user.create({
  data: {
    email: `prodrev-player-${stamp}@test.amateur`,
    passwordHash: await bcrypt.hash(password, 10),
    firstName: "Prodrev",
    lastName: "Player",
    phone: "999999997",
    roles: { create: [{ role: "JUGADOR" }] },
  },
});

const tournament = await prisma.tournament.create({
  data: {
    name: `Torneo ProdReview ${stamp}`,
    format: "liga",
    status: "en_curso",
    maxTeams: 2,
    startDate: new Date(Date.now() + (2 * 24 + 3) * 60 * 60 * 1000),
    location: "Cancha de prueba",
    minutesPerHalf: 45,
    organizerId: org.id,
  },
});

const myClub = await prisma.club.create({
  data: { name: `Club Prodrev Real ${stamp}`, shortName: "PRR", color: "#1565C0", ownerId: clubOwner.id, isTemporary: false },
});
const rival = await prisma.club.create({
  data: { name: "Club Rival ProdRev", shortName: "RIV", color: "#E53935", ownerId: org.id, isTemporary: true },
});

await prisma.tournamentTeam.createMany({
  data: [
    { tournamentId: tournament.id, clubId: myClub.id },
    { tournamentId: tournament.id, clubId: rival.id },
  ],
});

const future = new Date(Date.now() + (2 * 24 + 3) * 60 * 60 * 1000);
const match = await prisma.match.create({
  data: {
    tournamentId: tournament.id,
    homeTeamId: myClub.id,
    awayTeamId: rival.id,
    status: "programado",
    date: new Date(future.toISOString().slice(0, 10) + "T00:00:00Z"),
    time: "10:00",
    location: "Cancha de prueba",
    matchday: 1,
  },
});

console.log(JSON.stringify({
  orgEmail: org.email, clubOwnerEmail: clubOwner.email, playerEmail: player.email, password,
  tournamentId: tournament.id, matchId: match.id, myClubId: myClub.id,
}, null, 2));
await prisma.$disconnect();
