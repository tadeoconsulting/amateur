// Pruebas unitarias de src/_lib/notification-history.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { organizerHistory } from "../../src/_lib/notification-history.ts";

const NOW = Date.parse("2026-10-10T12:00:00Z");
const daysAgo = (d) => new Date(NOW - d * 86_400_000).toISOString();
const item = (over) => ({
  id: "r1",
  kind: "request",
  status: "pending",
  createdAt: daysAgo(1),
  resolvedAt: null,
  clubName: "Sport Lima",
  tournamentName: "Copa Amistad",
  ...over,
});

test("una solicitud pendiente no se lista: ya está arriba con sus botones", () => {
  assert.deepEqual(organizerHistory([item({})], NOW), []);
});

test("una invitación pendiente sí: solo espera al club", () => {
  const [e] = organizerHistory([item({ kind: "invite" })], NOW);
  assert.equal(e.text, "Invitaste a Sport Lima a Copa Amistad");
});

test("una solicitud resuelta aporta cuándo se pidió y cuándo se resolvió", () => {
  const events = organizerHistory([item({ status: "accepted", createdAt: daysAgo(3), resolvedAt: daysAgo(2) })], NOW);
  assert.deepEqual(events.map((e) => e.text), ["Aceptaste a Sport Lima en Copa Amistad", "Sport Lima pidió unirse a Copa Amistad"]);
});

test("el texto depende de quién actuó: solicitud (decide el organizador) o invitación (decide el club)", () => {
  const text = (kind, status) => organizerHistory([item({ kind, status, createdAt: daysAgo(30), resolvedAt: daysAgo(1) })], NOW)[0].text;
  assert.equal(text("request", "accepted"), "Aceptaste a Sport Lima en Copa Amistad");
  assert.equal(text("request", "declined"), "Rechazaste a Sport Lima en Copa Amistad");
  assert.equal(text("request", "cancelled"), "Sport Lima canceló su solicitud a Copa Amistad");
  assert.equal(text("invite", "accepted"), "Sport Lima aceptó tu invitación a Copa Amistad");
  assert.equal(text("invite", "declined"), "Sport Lima rechazó tu invitación a Copa Amistad");
  assert.equal(text("invite", "cancelled"), "Cancelaste la invitación a Sport Lima en Copa Amistad");
});

test("solo cuenta la última semana: lo más viejo queda afuera", () => {
  const events = organizerHistory([item({ status: "declined", createdAt: daysAgo(10), resolvedAt: daysAgo(6) })], NOW);
  assert.deepEqual(events.map((e) => e.text), ["Rechazaste a Sport Lima en Copa Amistad"]);
  assert.deepEqual(organizerHistory([item({ status: "declined", createdAt: daysAgo(10), resolvedAt: daysAgo(8) })], NOW), []);
});

test("va del más reciente al más viejo, entre torneos distintos", () => {
  const events = organizerHistory(
    [
      item({ id: "a", kind: "invite", createdAt: daysAgo(5), tournamentName: "T1" }),
      item({ id: "b", kind: "invite", createdAt: daysAgo(1), tournamentName: "T2" }),
    ],
    NOW
  );
  assert.deepEqual(events.map((e) => e.id), ["b:created", "a:created"]);
});

test("un estado resuelto sin fecha de resolución no inventa un hecho", () => {
  const events = organizerHistory([item({ status: "accepted", createdAt: daysAgo(30), resolvedAt: null })], NOW);
  assert.deepEqual(events, []);
});
