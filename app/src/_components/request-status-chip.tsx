import { requestStatusLabel } from "@/_lib/tournament-request";

const TONE: Record<string, string> = {
  pending: "bg-yellow/30 text-brand-900",
  accepted: "bg-verification/20 text-brand-900",
  declined: "bg-brand-300 text-brand-700",
  cancelled: "bg-brand-300 text-brand-700",
};

/** Estado de una solicitud. Siempre lleva texto: el color solo no comunica. */
export function RequestStatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status] ?? TONE.cancelled}`}>
      {requestStatusLabel(status)}
    </span>
  );
}
