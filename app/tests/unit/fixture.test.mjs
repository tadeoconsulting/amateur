// Pruebas unitarias de src/_lib/fixture.ts. No necesitan servidor ni base de datos:
//   npm run test:unit

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  roundRobin,
  roundRobinMatchdays,
  planFixture,
  scheduleFixture,
  buildSlots,
  slotMinutesFor,
  validateMatchdayConfig,
  supportsFixture,
  isUnscheduled,
} from "../../src/_lib/fixture.ts";

const ids = (n) => Array.from({ length: n }, (_, i) => `t${i + 1}`);
const pairKey = (m) => [m.homeTeamId, m.awayTeamId].sort().join("-");

// 4 sábados seguidos de 18:00 a 22:00: 4 horarios de una hora por sábado.
const saturdays = (overrides = {}) => ({
  days: [6],
  startDate: "2026-10-03", // sábado
  endDate: "2026-10-24",
  startTime: "18:00",
  endTime: "22:00",
  venue: "torneo",
  ...overrides,
});

describe("todos contra todos", () => {
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 12]) {
    test(`${n} equipos: cada par se enfrenta exactamente una vez`, () => {
      const matches = roundRobin(ids(n));
      assert.equal(matches.length, (n * (n - 1)) / 2);
      const pairs = new Set(matches.map(pairKey));
      assert.equal(pairs.size, matches.length, "no debe haber cruces repetidos");
    });

    test(`${n} equipos: en cada fecha nadie juega dos veces`, () => {
      const matches = roundRobin(ids(n));
      const matchdays = Math.max(...matches.map((m) => m.matchday));
      assert.equal(matchdays, roundRobinMatchdays(n));
      for (let md = 1; md <= matchdays; md++) {
        const playing = matches.filter((m) => m.matchday === md).flatMap((m) => [m.homeTeamId, m.awayTeamId]);
        assert.equal(new Set(playing).size, playing.length, `fecha ${md}: un equipo repetido`);
        // Con cantidad par juegan todos; con impar descansa exactamente uno.
        assert.equal(playing.length, n % 2 === 0 ? n : n - 1);
      }
    });

    test(`${n} equipos: cada uno juega contra todos los demás`, () => {
      const matches = roundRobin(ids(n));
      for (const id of ids(n)) {
        const games = matches.filter((m) => m.homeTeamId === id || m.awayTeamId === id);
        assert.equal(games.length, n - 1);
      }
    });
  }

  // Cuántos partidos de más de local o de visitante tiene un equipo, y su racha más larga.
  const balance = (matches, id) => {
    const games = matches
      .filter((m) => m.homeTeamId === id || m.awayTeamId === id)
      .sort((a, b) => a.matchday - b.matchday);
    const home = games.filter((m) => m.homeTeamId === id).length;
    let streak = 1;
    let longest = 1;
    for (let k = 1; k < games.length; k++) {
      streak = (games[k].homeTeamId === id) === (games[k - 1].homeTeamId === id) ? streak + 1 : 1;
      longest = Math.max(longest, streak);
    }
    return { diff: Math.abs(home - (games.length - home)), longest };
  };

  test("cantidad par: local y visitante parejos (1 de diferencia, nunca más de 2 seguidos)", () => {
    for (const n of [4, 6, 8, 10, 12, 14, 16]) {
      const matches = roundRobin(ids(n));
      for (const id of ids(n)) {
        const { diff, longest } = balance(matches, id);
        assert.ok(diff <= 1, `${n} equipos, ${id}: diferencia de ${diff}`);
        assert.ok(longest <= 2, `${n} equipos, ${id}: racha de ${longest}`);
      }
    }
  });

  test("cantidad impar (alguien descansa cada fecha): diferencia de 2 y rachas de 3 como máximo", () => {
    for (const n of [3, 5, 7, 9, 11, 13]) {
      const matches = roundRobin(ids(n));
      for (const id of ids(n)) {
        const { diff, longest } = balance(matches, id);
        assert.ok(diff <= 2, `${n} equipos, ${id}: diferencia de ${diff}`);
        assert.ok(longest <= 3, `${n} equipos, ${id}: racha de ${longest}`);
      }
    }
  });

  test("con un solo equipo o ninguno no hay partidos", () => {
    assert.deepEqual(roundRobin([]), []);
    assert.deepEqual(roundRobin(["a"]), []);
    assert.equal(roundRobinMatchdays(1), 0);
  });

  test("es determinista: mismo orden de equipos, mismo fixture", () => {
    assert.deepEqual(roundRobin(ids(6)), roundRobin(ids(6)));
  });
});

describe("planFixture", () => {
  const teams = (n, group = null) => ids(n).map((id) => ({ id, groupName: group }));

  test("liga: todos contra todos, sin grupo", () => {
    const plan = planFixture(teams(5), "liga");
    assert.equal(plan.ok, true);
    assert.equal(plan.matchdays, 5);
    assert.equal(plan.matches.length, 10);
    assert.ok(plan.matches.every((m) => m.groupName === null));
  });

  test("grupos: se juega dentro de cada grupo y las fechas coinciden", () => {
    const list = [
      ...ids(4).map((id) => ({ id: `a-${id}`, groupName: "Grupo A" })),
      ...ids(3).map((id) => ({ id: `b-${id}`, groupName: "Grupo B" })),
    ];
    const plan = planFixture(list, "grupos");
    assert.equal(plan.ok, true);
    assert.equal(plan.matches.length, 6 + 3);
    assert.equal(plan.matchdays, 3);
    for (const m of plan.matches) {
      assert.equal(m.homeTeamId.slice(0, 1), m.awayTeamId.slice(0, 1), "solo cruces dentro del mismo grupo");
      assert.equal(m.groupName, m.homeTeamId.startsWith("a") ? "Grupo A" : "Grupo B");
    }
  });

  test("rechaza lo que no se puede armar", () => {
    assert.equal(planFixture(teams(1), "liga").ok, false, "un equipo");
    assert.equal(planFixture([], "liga").ok, false, "sin equipos");
    assert.equal(planFixture(teams(4), "eliminacion").ok, false, "formato sin soporte");
    assert.equal(planFixture(teams(4), "copa").ok, false);
    assert.equal(planFixture(teams(4), "relampago").ok, false);
    assert.equal(planFixture(teams(4), "grupos").ok, false, "grupos sin grupo asignado");
    const solo = [...teams(3, "A"), { id: "x", groupName: "B" }];
    const r = planFixture(solo, "grupos");
    assert.equal(r.ok, false);
    assert.match(r.error, /Grupo|grupo/);
  });

  test("qué formatos tienen fixture", () => {
    assert.equal(supportsFixture("liga"), true);
    assert.equal(supportsFixture("grupos"), true);
    assert.equal(supportsFixture("eliminacion"), false);
  });
});

describe("configuración de una fecha", () => {
  const bad = (overrides, pattern) => {
    const problem = validateMatchdayConfig(saturdays(overrides));
    assert.ok(problem, `debía ser inválida: ${JSON.stringify(overrides)}`);
    assert.match(problem, pattern);
  };

  test("una configuración correcta no tiene problemas", () => {
    assert.equal(validateMatchdayConfig(saturdays()), null);
  });

  test("detecta los errores", () => {
    bad({ days: [] }, /día/);
    bad({ days: [7] }, /día/);
    bad({ days: [1.5] }, /día/);
    bad({ startDate: "2026-13-40" }, /fecha/i);
    bad({ startDate: "03/10/2026" }, /fecha/i);
    bad({ endDate: "2026-09-01" }, /anterior/);
    bad({ endDate: "2028-01-01" }, /año/);
    bad({ startTime: "25:00" }, /horario/);
    bad({ endTime: "18:00" }, /fin/);
    bad({ endTime: "17:00" }, /fin/);
    bad({ venue: "estadio" }, /sede/);
  });

  test("una fecha inexistente (31 de febrero) no pasa", () => {
    bad({ startDate: "2026-02-31" }, /fecha/i);
  });
});

describe("horarios", () => {
  test("cuenta los horarios según los días y la duración", () => {
    // 4 sábados (3, 10, 17, 24 de octubre) x 4 horarios de 60 min entre 18:00 y 22:00.
    assert.equal(buildSlots(saturdays(), 60).length, 16);
    // Con 70 min (25+25+10+10 de descanso...) caben 3 por noche.
    assert.equal(buildSlots(saturdays(), 70).length, 12);
    // El último horario tiene que terminar antes de la hora de fin.
    const last = buildSlots(saturdays({ endDate: "2026-10-03" }), 60).at(-1);
    assert.equal(last.time, "21:00");
  });

  test("solo los días elegidos", () => {
    const slots = buildSlots(saturdays({ days: [0, 6], endDate: "2026-10-11" }), 60);
    const dates = [...new Set(slots.map((s) => s.date))];
    assert.deepEqual(dates, ["2026-10-03", "2026-10-04", "2026-10-10", "2026-10-11"]);
  });

  test("duración de un horario", () => {
    assert.equal(slotMinutesFor(25), 60);
    assert.equal(slotMinutesFor(45), 100);
    assert.equal(slotMinutesFor(null), 60);
    assert.equal(slotMinutesFor(0), 60);
  });
});

describe("calendarizar el fixture", () => {
  const teamName = (id) => `Equipo ${id}`;
  const options = { slotMinutes: 60, tournamentLocation: "Estadio Municipal", teamName };
  const plan4 = () => planFixture(ids(4).map((id) => ({ id, groupName: null })), "liga").matches;

  test("una liga de 4 equipos en sábados: 6 partidos en 3 fechas, sin choques", () => {
    // Una fecha por sábado (cada rango cubre un solo sábado).
    const configs = [
      saturdays({ startDate: "2026-10-03", endDate: "2026-10-03" }),
      saturdays({ startDate: "2026-10-10", endDate: "2026-10-10" }),
      saturdays({ startDate: "2026-10-17", endDate: "2026-10-17" }),
    ];
    const r = scheduleFixture(plan4(), configs, options);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.matches.length, 6);
    for (const m of r.matches) {
      assert.equal(m.location, "Estadio Municipal");
      assert.equal(new Date(`${m.date}T00:00:00Z`).getUTCDay(), 6, "solo sábados");
      assert.ok(m.time >= "18:00" && m.time <= "21:00");
    }
    // Cada fecha cae en su sábado.
    assert.deepEqual([...new Set(r.matches.filter((m) => m.matchday === 2).map((m) => m.date))], ["2026-10-10"]);
    // Nunca dos partidos en la misma sede a la misma hora.
    const slots = r.matches.map((m) => `${m.date}|${m.time}`);
    assert.equal(new Set(slots).size, slots.length);
  });

  test("sede del torneo: los partidos de una fecha van uno tras otro", () => {
    const configs = [saturdays({ endDate: "2026-10-03" }), saturdays({ endDate: "2026-10-10", startDate: "2026-10-10" }), saturdays({ startDate: "2026-10-17", endDate: "2026-10-17" })];
    const r = scheduleFixture(plan4(), configs, options);
    const first = r.matches.filter((m) => m.matchday === 1).map((m) => m.time);
    assert.deepEqual(first, ["18:00", "19:00"]);
  });

  test("dos fechas con el mismo rango no se pisan (calendario global)", () => {
    // Las 3 fechas comparten los mismos 3 sábados: 6 partidos entre 12 horarios.
    const r = scheduleFixture(plan4(), [saturdays(), saturdays(), saturdays()], options);
    assert.equal(r.ok, true);
    const slots = r.matches.map((m) => `${m.date}|${m.time}`);
    assert.equal(new Set(slots).size, 6, "cada partido en un horario distinto");
    for (const team of ids(4)) {
      const own = r.matches.filter((m) => m.homeTeamId === team || m.awayTeamId === team).map((m) => `${m.date}|${m.time}`);
      assert.equal(new Set(own).size, own.length, `${team} juega dos veces a la misma hora`);
    }
  });

  test("sede del local: cada uno en su cancha, y pueden jugar a la vez", () => {
    const configs = [
      saturdays({ venue: "local", endDate: "2026-10-03" }),
      saturdays({ venue: "local", startDate: "2026-10-10", endDate: "2026-10-10" }),
      saturdays({ venue: "local", startDate: "2026-10-17", endDate: "2026-10-17" }),
    ];
    const r = scheduleFixture(plan4(), configs, options);
    assert.equal(r.ok, true);
    for (const m of r.matches) assert.equal(m.location, `Cancha de Equipo ${m.homeTeamId}`);
    // En cada fecha los dos partidos comparten el primer horario (canchas distintas).
    const first = r.matches.filter((m) => m.matchday === 1);
    assert.equal(first[0].time, first[1].time);
    assert.equal(first[0].time, "18:00");
  });

  test("falta de horarios: error claro y con el número de fecha", () => {
    // 1 solo horario disponible para 2 partidos.
    const tight = saturdays({ startDate: "2026-10-03", endDate: "2026-10-03", startTime: "18:00", endTime: "19:00" });
    const r = scheduleFixture(plan4(), [tight, saturdays(), saturdays()], options);
    assert.equal(r.ok, false);
    assert.equal(r.matchday, 1);
    assert.match(r.error, /fecha 1/i);
    assert.match(r.error, /horarios suficientes/);
  });

  test("la cantidad de configuraciones tiene que coincidir con las fechas", () => {
    const r = scheduleFixture(plan4(), [saturdays()], options);
    assert.equal(r.ok, false);
    assert.match(r.error, /3 fechas/);
  });

  test("una configuración inválida se reporta con su fecha", () => {
    const r = scheduleFixture(plan4(), [saturdays(), saturdays({ days: [] }), saturdays()], options);
    assert.equal(r.ok, false);
    assert.equal(r.matchday, 2);
    assert.match(r.error, /Fecha 2/);
  });

  test("con cantidad impar de equipos también calendariza", () => {
    const plan = planFixture(ids(5).map((id) => ({ id, groupName: null })), "liga");
    const configs = Array.from({ length: plan.matchdays }, (_, i) =>
      saturdays({ startDate: `2026-10-${String(3 + i * 7).padStart(2, "0")}`, endDate: `2026-10-${String(3 + i * 7).padStart(2, "0")}` })
    );
    const r = scheduleFixture(plan.matches, configs, options);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.matches.length, 10);
  });
});

describe("partidos sin programar", () => {
  test("un partido sin hora está sin programar", () => {
    assert.equal(isUnscheduled({ time: "" }), true);
    assert.equal(isUnscheduled({ time: "18:00" }), false);
  });
});
