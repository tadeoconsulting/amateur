import type { FeeStatus } from "@/_lib/club-fees";

const CONFIG: Record<FeeStatus | "vencido", { label: string; className: string }> = {
  pagado: { label: "Pagado", className: "bg-verification/20 text-brand-900" },
  parcial: { label: "Parcial", className: "bg-yellow/50 text-brand-900" },
  pendiente: { label: "Pendiente", className: "bg-brand-200 text-text-primary" },
  vencido: { label: "Vencido", className: "bg-red/20 text-brand-900" },
  sin_cuota: { label: "Sin cuota", className: "bg-brand-300 text-brand-700" },
};

/** El estado de un mes. Un mes con saldo que ya venció se muestra como "Vencido" (si es parcial, lo aclara el saldo). */
export function FeeStatusChip({ status, overdue }: { status: FeeStatus; overdue: boolean }) {
  const key = overdue ? "vencido" : status;
  const c = CONFIG[key];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>{c.label}</span>;
}
