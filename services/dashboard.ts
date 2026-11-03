import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionWithPatient } from "@/types/domain";
import { BILLABLE_FILTER } from "@/lib/utils";

const SELECT_WITH_PATIENT = "*, patient:patients(name)";

export interface DashboardData {
  totalPatients: number;
  sessionsToday: number;
  pendingCount: number;
  pendingTotal: number;
  noShowsThisMonth: number;
  upcomingSessions: SessionWithPatient[];
  recentPending: SessionWithPatient[];
}

export async function getDashboardData(
  supabase: SupabaseClient,
  today: string,
  month: { start: string; end: string }
): Promise<DashboardData> {
  const [
    patientsRes,
    todayRes,
    noShowRes,
    pendingRes,
    upcomingRes,
    recentPendingRes,
  ] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("session_date", today)
      .neq("status", "cancelled"),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "no_show")
      .gte("session_date", month.start)
      .lte("session_date", month.end),
    supabase
      .from("sessions")
      .select("amount")
      .eq("payment_status", "pending")
      .or(BILLABLE_FILTER),
    supabase
      .from("sessions")
      .select(SELECT_WITH_PATIENT)
      .eq("status", "scheduled")
      .gte("session_date", today)
      .order("session_date", { ascending: true })
      .order("session_time", { ascending: true })
      .limit(5),
    supabase
      .from("sessions")
      .select(SELECT_WITH_PATIENT)
      .eq("payment_status", "pending")
      .or(BILLABLE_FILTER)
      .order("session_date", { ascending: false })
      .order("session_time", { ascending: false })
      .limit(5),
  ]);

  for (const res of [
    patientsRes,
    todayRes,
    noShowRes,
    pendingRes,
    upcomingRes,
    recentPendingRes,
  ]) {
    if (res.error) throw new Error(res.error.message);
  }

  const pendingRows = (pendingRes.data ?? []) as { amount: number }[];
  const pendingTotal = pendingRows.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0
  );

  return {
    totalPatients: patientsRes.count ?? 0,
    sessionsToday: todayRes.count ?? 0,
    pendingCount: pendingRows.length,
    pendingTotal,
    noShowsThisMonth: noShowRes.count ?? 0,
    upcomingSessions: (upcomingRes.data ?? []) as unknown as SessionWithPatient[],
    recentPending: (recentPendingRes.data ?? []) as unknown as SessionWithPatient[],
  };
}
