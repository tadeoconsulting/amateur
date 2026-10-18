// Pruebas de src/_lib/club-fees.ts (cuotas del club, especificación 015), sin servidor.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  balanceCents,
  collectionSummary,
  debtSummary,
  effectiveFeeCents,
  feeStatus,
  formatSoles,
  hasFeeDefined,
  isDueDay,
  isMonth,
  isOverdue,
  formatSolesAmount,
  monthLabel,
  monthName,
  monthsBetween,
  monthsToGenerate,
  nextMonth,
  paidCents,
  parseCents,
  paymentError,
  peruDate,
  peruMonth,
} from "../../src/_lib/club-fees.ts";

describe("meses en hora de Perú", () => {
  test("a las 2 a. m. UTC del 1 de noviembre todavía es 31 de octubre en Lima", () => {
    const now = new Date("2026-11-01T02:00:00Z");
    assert.equal(peruDate(now), "2026-10-31");
    assert.equal(peruMonth(now), "2026-10");
  });

  test("a las 5 a. m. UTC ya es el día siguiente en Lima", () => {
    assert.equal(peruMonth(new Date("2026-11-01T05:00:00Z")), "2026-11");
  });

  test("isMonth acepta AAAA-MM reales y rechaza el resto", () => {
    assert.equal(isMonth("2026-10"), true);
    assert.equal(isMonth("2026-13"), false);
    assert.equal(isMonth("2026-00"), false);
    assert.equal(isMonth("2026-1"), false);
    assert.equal(isMonth("1999-12"), false);
    assert.equal(isMonth(202610), false);
  });

  test("nextMonth cruza el cambio de año", () => {
    assert.equal(nextMonth("2026-10"), "2026-11");
    assert.equal(nextMonth("2026-12"), "2027-01");
  });

  test("monthsBetween incluye ambos extremos y está vacío si el inicio es posterior", () => {
    assert.deepEqual(monthsBetween("2026-11", "2027-02"), ["2026-11", "2026-12", "2027-01", "2027-02"]);
    assert.deepEqual(monthsBetween("2026-10", "2026-10"), ["2026-10"]);
    assert.deepEqual(monthsBetween("2026-12", "2026-10"), []);
  });
});

describe("importes", () => {
  test("parseCents lee soles con hasta dos decimales", () => {
    assert.equal(parseCents(80), 8000);
    assert.equal(parseCents("80"), 8000);
    assert.equal(parseCents("80.5"), 8050);
    assert.equal(parseCents("80,50"), 8050);
    assert.equal(parseCents(0), 0);
    assert.equal(parseCents(0.3), 30);
  });

  test("parseCents rechaza negativos, tres decimales, texto y montos disparatados", () => {
    for (const bad of [-1, "-5", "80.123", "abc", "", null, undefined, NaN, Infinity, 10000.01, 99999]) {
      assert.equal(parseCents(bad), null, String(bad));
    }
    assert.equal(parseCents(10000), 1_000_000);
  });

  test("formatSoles muestra los céntimos solo cuando hacen falta", () => {
    assert.equal(formatSoles(8000), "S/ 80");
    assert.equal(formatSoles(8050), "S/ 80,50");
    assert.equal(formatSoles(5), "S/ 0,05");
    assert.equal(formatSoles(0), "S/ 0");
  });

  test("el día de vencimiento va del 1 al 28", () => {
    assert.equal(isDueDay(1), true);
    assert.equal(isDueDay(28), true);
    assert.equal(isDueDay(0), false);
    assert.equal(isDueDay(29), false);
    assert.equal(isDueDay(5.5), false);
    assert.equal(isDueDay("5"), false);
  });
});

describe("cuota efectiva", () => {
  test("hereda la del club salvo que tenga monto propio; 0 propio es gratis", () => {
    assert.equal(effectiveFeeCents(8000, null), 8000);
    assert.equal(effectiveFeeCents(8000, 6000), 6000);
    assert.equal(effectiveFeeCents(8000, 0), 0);
  });

  test("sin cuota del club ni monto propio no hay nada definido", () => {
    assert.equal(hasFeeDefined(0, null), false);
    assert.equal(hasFeeDefined(8000, null), true);
    assert.equal(hasFeeDefined(0, 6000), true);
    assert.equal(hasFeeDefined(0, 0), true); // gratis a propósito
  });
});

describe("meses por generar", () => {
  test("desde el primer mes de cobro hasta el actual, sin repetir los que ya existen", () => {
    assert.deepEqual(monthsToGenerate("2026-08", "2026-10", ["2026-08"]), ["2026-09", "2026-10"]);
    assert.deepEqual(monthsToGenerate("2026-10", "2026-10", ["2026-10"]), []);
  });

  test("un jugador que entró en octubre no debe septiembre", () => {
    assert.deepEqual(monthsToGenerate("2026-10", "2026-10", []), ["2026-10"]);
    assert.equal(monthsToGenerate("2026-10", "2026-10", []).includes("2026-09"), false);
  });

  test("un primer mes de cobro en el futuro no genera nada", () => {
    assert.deepEqual(monthsToGenerate("2026-12", "2026-10", []), []);
  });
});

describe("estado de un mes", () => {
  const pay = (amountCents, voided = false) => ({ amountCents, voided });

  test("los abonos anulados no cuentan", () => {
    assert.equal(paidCents([pay(4000), pay(4000, true)]), 4000);
    assert.equal(paidCents([]), 0);
  });

  test("pendiente, parcial, pagado y sin cuota", () => {
    assert.equal(feeStatus(8000, 0), "pendiente");
    assert.equal(feeStatus(8000, 4000), "parcial");
    assert.equal(feeStatus(8000, 8000), "pagado");
    assert.equal(feeStatus(8000, 9000), "pagado");
    assert.equal(feeStatus(0, 0), "sin_cuota");
  });

  test("el saldo nunca es negativo", () => {
    assert.equal(balanceCents(8000, 4000), 4000);
    assert.equal(balanceCents(8000, 9000), 0);
  });

  test("vence después del día de vencimiento, no el mismo día", () => {
    assert.equal(isOverdue("2026-10", 5, "pendiente", "2026-10-05"), false);
    assert.equal(isOverdue("2026-10", 5, "pendiente", "2026-10-06"), true);
    assert.equal(isOverdue("2026-10", 5, "parcial", "2026-11-01"), true);
  });

  test("un mes pagado o sin cuota no vence nunca", () => {
    assert.equal(isOverdue("2026-08", 5, "pagado", "2026-10-30"), false);
    assert.equal(isOverdue("2026-08", 5, "sin_cuota", "2026-10-30"), false);
  });

  test("un mes futuro no está vencido", () => {
    assert.equal(isOverdue("2026-12", 5, "pendiente", "2026-10-30"), false);
  });
});

describe("deuda de un jugador", () => {
  test("suma el saldo de todos los meses y separa lo ya vencido", () => {
    const months = [
      { month: "2026-08", dueCents: 8000, paidCents: 8000 }, // pagado
      { month: "2026-09", dueCents: 8000, paidCents: 3000 }, // parcial vencido: faltan 50
      { month: "2026-10", dueCents: 8000, paidCents: 0 }, // el 4 de octubre todavía no vence
    ];
    const d = debtSummary(months, 5, "2026-10-04");
    assert.equal(d.owedCents, 5000 + 8000);
    assert.equal(d.overdueCents, 5000);
    assert.equal(d.overdueMonths, 1);
  });

  test("un jugador gratis no debe nada", () => {
    const d = debtSummary([{ month: "2026-10", dueCents: 0, paidCents: 0 }], 5, "2026-10-30");
    assert.deepEqual(d, { owedCents: 0, overdueCents: 0, overdueMonths: 0 });
  });

  test("sin meses no hay deuda", () => {
    assert.deepEqual(debtSummary([], 5, "2026-10-30"), { owedCents: 0, overdueCents: 0, overdueMonths: 0 });
  });
});

describe("recaudado contra esperado", () => {
  test("el porcentaje sale de lo cobrado sobre lo esperado", () => {
    const months = [
      { month: "2026-10", dueCents: 8000, paidCents: 8000 },
      { month: "2026-10", dueCents: 8000, paidCents: 4000 },
      { month: "2026-10", dueCents: 6000, paidCents: 0 },
      { month: "2026-10", dueCents: 0, paidCents: 0 },
    ];
    const c = collectionSummary(months);
    assert.equal(c.expectedCents, 22000);
    assert.equal(c.collectedCents, 12000);
    assert.equal(c.percent, 55);
  });

  test("lo abonado de más no infla lo recaudado", () => {
    const c = collectionSummary([{ month: "2026-10", dueCents: 8000, paidCents: 9500 }]);
    assert.equal(c.collectedCents, 8000);
    assert.equal(c.percent, 100);
  });

  test("sin nada que cobrar el porcentaje es 100, no una división por cero", () => {
    assert.equal(collectionSummary([]).percent, 100);
  });
});

describe("validar un abono", () => {
  test("rechaza cero, negativos y lo que supera el saldo", () => {
    assert.match(paymentError(null, 8000), /mayor a 0/);
    assert.match(paymentError(0, 8000), /mayor a 0/);
    assert.match(paymentError(9000, 8000), /S\/ 80/);
  });

  test("acepta un abono parcial y el saldo exacto", () => {
    assert.equal(paymentError(4000, 8000), null);
    assert.equal(paymentError(8000, 8000), null);
  });

  test("un mes sin saldo no admite más abonos", () => {
    assert.notEqual(paymentError(100, 0), null);
  });
});

describe("textos para la pantalla", () => {
  test("monthLabel y monthName", () => {
    assert.equal(monthLabel("2026-10"), "Octubre 2026");
    assert.equal(monthLabel("2027-01"), "Enero 2027");
    assert.equal(monthName("2026-09"), "septiembre");
  });

  test("formatSolesAmount toma soles de la API", () => {
    assert.equal(formatSolesAmount(80), "S/ 80");
    assert.equal(formatSolesAmount(80.5), "S/ 80,50");
    assert.equal(formatSolesAmount(0.1 + 0.2), "S/ 0,30");
  });
});
