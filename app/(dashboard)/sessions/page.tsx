import { requireUser } from "@/lib/auth";
import { listPatients } from "@/services/patients";
import { listSessions } from "@/services/sessions";
import { SessionsView } from "@/components/sessions/SessionsView";
import { SESSION_STATUSES, isUuid } from "@/lib/utils";
import type { SessionStatus } from "@/types/domain";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string; status?: string }>;
}) {
  const { supabase, user } = await requireUser();

  // valida os filtros vindos da URL
  const patientId =
    (await searchParams).patient && isUuid((await searchParams).patient) ? (await searchParams).patient : "";
  const status = SESSION_STATUSES.includes((await searchParams).status as SessionStatus)
    ? ((await searchParams).status as SessionStatus)
    : "";

  const [sessions, patients] = await Promise.all([
    listSessions(supabase, { patientId, status }),
    listPatients(supabase),
  ]);

  return (
    <SessionsView
      userId={user.id}
      sessions={sessions}
      patients={patients.map((p) => ({
        id: p.id,
        name: p.name,
        session_price: p.session_price,
      }))}
      filters={{ patientId, status }}
    />
  );
}
