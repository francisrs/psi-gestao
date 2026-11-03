import type { PaymentStatus, Session, SessionStatus } from "@/types/domain";
import {
  CANCELLED_BY_LABELS,
  PAYMENT_LABELS,
  SESSION_STATUS_LABELS,
} from "@/lib/utils";

type CancellationFields = Pick<
  Session,
  | "status"
  | "payment_status"
  | "cancelled_by"
  | "cancellation_fee_applies"
  | "rescheduled_to_id"
>;

const SESSION_STYLES: Record<SessionStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 ring-blue-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  no_show: "bg-amber-50 text-amber-700 ring-amber-600/20",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

const BASE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span className={`${BASE} ${SESSION_STYLES[status]}`}>
      {SESSION_STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`${BASE} ${PAYMENT_STYLES[status]}`}>
      {PAYMENT_LABELS[status]}
    </span>
  );
}

/** Pagamento da sessao; cancelamentos sem cobranca mostram "Sem cobranca". */
export function SessionPaymentBadge({ session }: { session: CancellationFields }) {
  if (session.status === "cancelled" && !session.cancellation_fee_applies) {
    return (
      <span className={`${BASE} bg-slate-100 text-slate-600 ring-slate-500/20`}>
        Sem cobranca
      </span>
    );
  }
  return <PaymentBadge status={session.payment_status} />;
}

/** Texto curto explicando um cancelamento (quem cancelou, cobranca, remarcacao). */
export function CancellationNote({ session }: { session: CancellationFields }) {
  if (session.status !== "cancelled" || !session.cancelled_by) return null;

  const who = `Cancelada por: ${CANCELLED_BY_LABELS[session.cancelled_by]}`;
  let detail = "";
  if (session.cancelled_by === "patient") {
    detail = session.cancellation_fee_applies
      ? "cobrada (cancelamento tardio)"
      : "sem cobranca";
  } else {
    detail = session.rescheduled_to_id
      ? "remarcada sem onus"
      : "aguardando remarcacao";
  }

  return (
    <p className="text-xs text-slate-500">
      {who} · {detail}
    </p>
  );
}
