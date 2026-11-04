import { requireUser } from "@/lib/auth";
import { listPatients } from "@/services/patients";
import { PatientsView } from "@/components/patients/PatientsView";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;
  const query = sp.q ?? "";
  const patients = await listPatients(supabase, query);

  return <PatientsView userId={user.id} patients={patients} initialQuery={query} />;
}
