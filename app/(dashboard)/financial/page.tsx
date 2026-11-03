import Link from "next/link";
import { CircleCheck, Clock, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFinancialSummary, listPendingSessions } from "@/services/sessions";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CancellationNote, SessionStatusBadge } from "@/components/ui/StatusBadge";
import { MarkPaidButton } from "@/components/financial/MarkPaidButton";

export default async function FinancialPage() {
  const { supabase } = await requireUser();

  const [summary, pending] = await Promise.all([
    getFinancialSummary(supabase),
    listPendingSessions(supabase),
  ]);

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Acompanhe o que foi recebido e o que ainda esta pendente."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total pendente" value={formatCurrency(summary.totalPending)} icon={Clock} />
        <SummaryCard label="Total pago" value={formatCurrency(summary.totalPaid)} icon={CircleCheck} />
        <SummaryCard label="Sessoes pendentes" value={summary.pendingCount} icon={Receipt} />
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Sessoes com pagamento pendente</h2>
        </div>

        {pending.length === 0 ? (
          <EmptyState
            title="Nenhum pagamento pendente"
            description="Quando houver sessoes a receber, elas aparecerao aqui."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/patients/${s.patient_id}`}
                    className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                  >
                    {s.patient?.name ?? "Paciente removido"}
                  </Link>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatDate(s.session_date)} as {formatTime(s.session_time)}
                  </p>
                  <CancellationNote session={s} />
                </div>
                <div className="flex items-center gap-3">
                  <SessionStatusBadge status={s.status} />
                  <span className="text-sm font-medium text-slate-800">
                    {formatCurrency(s.amount)}
                  </span>
                  <MarkPaidButton sessionId={s.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
