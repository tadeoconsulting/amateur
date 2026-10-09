// Pruebas del calendario .ics (src/_lib/ics.ts, sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs, escapeIcsText, eventTimes, foldIcsLine } from "../../src/_lib/ics.ts";

const ev = (over = {}) => ({ uid: "m1@cupamateur.com", summary: "Alfa FC vs Beta FC", date: "2026-10-10T00:00:00.000Z", time: "09:30", durationMinutes: 60, ...over });

test("el inicio y el fin salen a la hora de reloj de la cancha, sin zona", () => {
  assert.deepEqual(eventTimes(ev()), { start: "20261010T093000", end: "20261010T103000" });
});

test("un partido que termina después de medianoche termina al día siguiente", () => {
  assert.deepEqual(eventTimes(ev({ time: "23:30", durationMinutes: 90 })), { start: "20261010T233000", end: "20261011T010000" });
});

test("se escapan comas, puntos y coma, barras y saltos de línea", () => {
  assert.equal(escapeIcsText("Sede Norte, Lima; piso 2\\ A\nB"), "Sede Norte\\, Lima\\; piso 2\\\\ A\\nB");
});

test("las líneas largas se parten en 75 bytes con una continuación que empieza en espacio", () => {
  const folded = foldIcsLine("DESCRIPTION:" + "á".repeat(80));
  const parts = folded.split("\r\n");
  assert.ok(parts.length > 1);
  for (const part of parts) assert.ok(new TextEncoder().encode(part).length <= 75);
  assert.ok(parts.slice(1).every((p) => p.startsWith(" ")));
  assert.equal(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join(""), "DESCRIPTION:" + "á".repeat(80));
});

test("el calendario tiene la estructura de RFC 5545 y termina en CRLF", () => {
  const ics = buildIcs({ name: "Liga, Norte", events: [ev({ location: "Sede, Lima", description: "Fecha 5", url: "https://cupamateur.com/x/y" })], now: new Date("2026-10-09T12:00:00Z") });
  const lines = ics.split("\r\n");
  assert.equal(lines[0], "BEGIN:VCALENDAR");
  assert.ok(lines.includes("X-WR-CALNAME:Liga\\, Norte"));
  assert.ok(lines.includes("DTSTAMP:20261009T120000Z"));
  assert.ok(lines.includes("DTSTART:20261010T093000"));
  assert.ok(lines.includes("LOCATION:Sede\\, Lima"));
  assert.ok(lines.includes("URL:https://cupamateur.com/x/y"));
  assert.equal(lines.filter((l) => l === "BEGIN:VEVENT").length, 1);
  assert.equal(lines[lines.length - 2], "END:VCALENDAR");
  assert.equal(lines[lines.length - 1], "");
});

test("sin partidos igual es un calendario válido, vacío", () => {
  const ics = buildIcs({ name: "Vacío", events: [] });
  assert.ok(!ics.includes("BEGIN:VEVENT"));
  assert.ok(ics.includes("END:VCALENDAR"));
});
