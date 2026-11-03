import type {
  BillingType,
  CancelledBy,
  PaymentStatus,
  Session,
  SessionStatus,
} from "@/types/domain";

export const APP_TIMEZONE =
  process.env.NEXT_PUBLIC_APP_TIMEZONE || "America/Sao_Paulo";

/** Antecedencia minima (em horas) para o paciente cancelar sem cobranca. */
export const LATE_CANCEL_HOURS =
  Number(process.env.NEXT_PUBLIC_LATE_CANCEL_HOURS) || 12;

/** Diferenca (UTC - hora local) do fuso informado, em ms, no instante dado. */
function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - utcMs;
}

/** Converte data (YYYY-MM-DD) e hora (HH:MM) no fuso do app para um instante (ms UTC). */
export function zonedDateTimeToMs(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  return guess - timeZoneOffsetMs(guess, APP_TIMEZONE);
}

/** Hora atual (HH:MM) no fuso do app. */
export function nowTimeISO(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

/** Horas de antecedencia entre o cancelamento e o inicio da sessao (pode ser negativo). */
export function cancellationNoticeHours(
  sessionDate: string,
  sessionTime: string,
  cancelDate: string,
  cancelTime: string
): number {
  const sessionMs = zonedDateTimeToMs(sessionDate, sessionTime);
  const cancelMs = zonedDateTimeToMs(cancelDate, cancelTime);
  return (sessionMs - cancelMs) / 3_600_000;
}

/**
 * Sessao entra na cobranca? Canceladas nao entram, exceto cancelamento
 * tardio do paciente (cancellation_fee_applies).
 */
export function countsForBilling(
  s: Pick<Session, "status" | "cancellation_fee_applies">
): boolean {
  return s.status !== "cancelled" || s.cancellation_fee_applies;
}

/** Filtro PostgREST equivalente a countsForBilling(). */
export const BILLABLE_FILTER = "status.neq.cancelled,cancellation_fee_applies.eq.true";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

/** "2025-03-09" -> "09/03/2025" (sem passar por Date, evita problemas de fuso). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "14:30:00" ou "14:30" -> "14:30" */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/** Data de hoje (YYYY-MM-DD) no fuso configurado. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(
    new Date()
  );
}

/** Primeiro e ultimo dia do mes da data informada. */
export function monthRange(todayIso: string): { start: string; end: string } {
  const [y, m] = todayIso.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return {
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Converte texto digitado ("150,50") em numero. Retorna NaN se invalido. */
export function parseMoney(value: string): number {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (normalized === "") return NaN;
  return Number(normalized);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export const BILLING_LABELS: Record<BillingType, string> = {
  per_session: "Por sessao",
  monthly: "Mensal",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  no_show: "Falta",
  cancelled: "Cancelada",
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
};

export const CANCELLED_BY_LABELS: Record<CancelledBy, string> = {
  patient: "Paciente",
  psychologist: "Psicologo(a)",
};

export const CANCELLED_BY_OPTIONS = Object.keys(
  CANCELLED_BY_LABELS
) as CancelledBy[];

export const SESSION_STATUSES = Object.keys(
  SESSION_STATUS_LABELS
) as SessionStatus[];
export const PAYMENT_STATUSES = Object.keys(PAYMENT_LABELS) as PaymentStatus[];
export const BILLING_TYPES = Object.keys(BILLING_LABELS) as BillingType[];

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}
