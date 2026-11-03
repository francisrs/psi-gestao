import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CircleCheck, Clock, UserX } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPatientDetail } from "@/services/patients";
import {
  BILLING_LABELS,
  formatCurrency,
  formatDate,
  formatTime,
  isUuid,
  todayISO,
} from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CancellationNote,
  SessionPaymentBadge,
  SessionStatusBadge,
} from "@/components/ui/StatusBadge";

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isUuid(params.id)) notFound();

  const { supabase } = await requireUser();
  const detail = await getPatientDetail(supabase, params.id, todayISO());
  if (!detail) notFound();

  const { patient, sessions, totalPaid, totalPending, noShowCount, nextSession } = detail;

  return (
    <>
      <Link
        href="/patients"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Pacientes
      </Link>

      <PageHeader
        title={patient.name}
        description={`${BILLING_LABELS[patient.billing_type]} · ${formatCurrency(patient.session_price)} por sessao`}
        actions={
          <Link href={`/sessions?patient=${patient.id}`} className="btn-secondary">
            Ver na agenda
          </Link>
        }
      />

      <section className="card mb-6 grid gap-4 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-slate-400">Telefone</p>
          <p className="mt-1 text-sm text-slate-800">{patient.phone || "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">E-mail</p>
          <p className="mt-1 break-all text-sm text-slate-800">{patient.email || "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Observacoes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{patient.notes || "-"}</p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total pago" value={formatCurrency(totalPaid)} icon={CircleCheck} />
        <SummaryCard label="Total pendente" value={formatCurrency(totalPending)} icon={Clock} />
        <SummaryCard label="Faltas" value={noShowCount} icon={UserX} />
        <SummaryCard
          label="Proxima sessao"
          value={nextSession ? formatDate(nextSession.session_date) : "-"}
          hint={nextSession ? `as ${formatTime(nextSession.session_time)}` : "Nenhuma agendada"}
          icon={CalendarClock}
        />
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Historico de sessoes</h2>
        </div>
        {sessions.length === 0 ? (
          <EmptyState
            title="Nenhuma sessao registrada"
            description="As sessoes deste paciente aparecerao aqui."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDate(s.session_date)} as {formatTime(s.session_time)}
                  </p>
                  <p className="text-sm text-slate-500">{formatCurrency(s.amount)}</p>
                  <CancellationNote session={s} />
                </div>
                <div className="flex gap-2">
                  <SessionStatusBadge status={s.status} />
                  <SessionPaymentBadge session={s} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
