import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionInput } from "@/types/database";
import type {
  Session,
  SessionStatus,
  SessionWithPatient,
} from "@/types/domain";
import { BILLABLE_FILTER, countsForBilling } from "@/lib/utils";

const SELECT_WITH_PATIENT = "*, patient:patients(name)";

export interface SessionFilters {
  patientId?: string;
  status?: SessionStatus | "";
}

export async function listSessions(
  supabase: SupabaseClient,
  filters: SessionFilters = {}
): Promise<SessionWithPatient[]> {
  let query = supabase
    .from("sessions")
    .select(SELECT_WITH_PATIENT)
    .order("session_date", { ascending: false })
    .order("session_time", { ascending: false });

  if (filters.patientId) query = query.eq("patient_id", filters.patientId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SessionWithPatient[];
}

/** Cria a sessao e retorna o id dela. */
export async function createSession(
  supabase: SupabaseClient,
  userId: string,
  input: SessionInput
): Promise<string> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ ...input, user_id: userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export interface RescheduleParams {
  originalId: string;
  patientId: string;
  date: string;
  time: string;
  /** Valor da nova sessao (o valor normal do paciente; nao ha custo extra). */
  amount: number;
}

/**
 * Remarcacao sem onus (sessao cancelada pelo psicologo): cria uma nova sessao
 * agendada e vincula a original a ela. Sao duas operacoes; se o vinculo falhar
 * a nova sessao continua valida e o erro e informado.
 */
export async function rescheduleSession(
  supabase: SupabaseClient,
  userId: string,
  params: RescheduleParams
): Promise<void> {
  const newId = await createSession(supabase, userId, {
    patient_id: params.patientId,
    session_date: params.date,
    session_time: params.time,
    status: "scheduled",
    payment_status: "pending",
    amount: params.amount,
    cancelled_by: null,
    cancelled_at: null,
    cancellation_fee_applies: false,
  });

  const { error } = await supabase
    .from("sessions")
    .update({ rescheduled_to_id: newId })
    .eq("id", params.originalId);
  if (error) {
    throw new Error(
      `A nova sessao foi criada, mas nao foi possivel vincula-la a original: ${error.message}`
    );
  }
}

export async function updateSession(
  supabase: SupabaseClient,
  id: string,
  input: SessionInput
): Promise<void> {
  // O vinculo de remarcacao so existe em sessoes canceladas (constraint no banco).
  const payload =
    input.status === "cancelled" ? input : { ...input, rescheduled_to_id: null };

  const { error } = await supabase.from("sessions").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSession(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markSessionAsPaid(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({ payment_status: "paid" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Sessoes com pagamento pendente. Canceladas nao entram na cobranca, exceto
 * cancelamento tardio do paciente (cancellation_fee_applies).
 */
export async function listPendingSessions(
  supabase: SupabaseClient
): Promise<SessionWithPatient[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select(SELECT_WITH_PATIENT)
    .eq("payment_status", "pending")
    .or(BILLABLE_FILTER)
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SessionWithPatient[];
}

export interface FinancialSummary {
  totalPending: number;
  totalPaid: number;
  pendingCount: number;
}

/** Totais financeiros. Para 20-60 pacientes, somar no servidor da app e suficiente. */
export async function getFinancialSummary(
  supabase: SupabaseClient
): Promise<FinancialSummary> {
  const { data, error } = await supabase
    .from("sessions")
    .select("amount, payment_status, status, cancellation_fee_applies");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Pick<
    Session,
    "amount" | "payment_status" | "status" | "cancellation_fee_applies"
  >[];

  let totalPending = 0;
  let totalPaid = 0;
  let pendingCount = 0;

  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    if (row.payment_status === "paid") {
      totalPaid += amount;
    } else if (countsForBilling(row)) {
      totalPending += amount;
      pendingCount += 1;
    }
  }

  return { totalPending, totalPaid, pendingCount };
}
