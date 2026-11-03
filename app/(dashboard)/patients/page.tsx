import { requireUser } from "@/lib/auth";
import { listPatients } from "@/services/patients";
import { PatientsView } from "@/components/patients/PatientsView";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { supabase, user } = await requireUser();
  const query = searchParams.q ?? "";
  const patients = await listPatients(supabase, query);

  return <PatientsView userId={user.id} patients={patients} initialQuery={query} />;
}
