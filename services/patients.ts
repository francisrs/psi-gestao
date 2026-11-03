import type { SupabaseClient } from "@supabase/supabase-js";
import type { PatientInput } from "@/types/database";
import type { Patient, Session } from "@/types/domain";
import { countsForBilling } from "@/lib/utils";

export async function listPatients(
  supabase: SupabaseClient,
  search?: string
): Promise<Patient[]> {
  let query = supabase
    .from("patients")
    .select("*")
    .order("name", { ascending: true });

  const term = search?.trim();
  if (term) {
    const escaped = term.replace(/[%_\\]/g, "\\$&");
    query = query.ilike("name", `%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Patient[];
}

export async function getPatient(
  supabase: SupabaseClient,
  id: string
): Promise<Patient | null> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Patient | null) ?? null;
}

export async function createPatient(
  supabase: SupabaseClient,
  userId: string,
  input: PatientInput
): Promise<void> {
  const { error } = await supabase
    .from("patients")
    .insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
}

export async function updatePatient(
  supabase: SupabaseClient,
  id: string,
  input: PatientInput
): Promise<void> {
  const { error } = await supabase.from("patients").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePatient(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface PatientDetail {
  patient: Patient;
  sessions: Session[];
  totalPaid: number;
  totalPending: number;
  noShowCount: number;
  nextSession: Session | null;
}

/** Paciente + historico de sessoes + indicadores. Retorna null se nao existir. */
export async function getPatientDetail(
  supabase: SupabaseClient,
  id: string,
  today: string
): Promise<PatientDetail | null> {
  const patient = await getPatient(supabase, id);
  if (!patient) return null;

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("patient_id", id)
    .order("session_date", { ascending: false })
    .order("session_time", { ascending: false });
  if (error) throw new Error(error.message);

  const sessions = (data ?? []) as Session[];

  let totalPaid = 0;
  let totalPending = 0;
  let noShowCount = 0;

  for (const s of sessions) {
    const amount = Number(s.amount) || 0;
    if (s.payment_status === "paid") totalPaid += amount;
    else if (countsForBilling(s)) totalPending += amount;
    if (s.status === "no_show") noShowCount += 1;
  }

  const nextSession =
    sessions
      .filter((s) => s.status === "scheduled" && s.session_date >= today)
      .sort((a, b) =>
        `${a.session_date} ${a.session_time}`.localeCompare(
          `${b.session_date} ${b.session_time}`
        )
      )[0] ?? null;

  return { patient, sessions, totalPaid, totalPending, noShowCount, nextSession };
}
