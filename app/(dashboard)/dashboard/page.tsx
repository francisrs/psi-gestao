import Link from "next/link";
import { CalendarCheck, UserX, Users, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/services/dashboard";
import { formatCurrency, formatDate, formatTime, monthRange, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const today = todayISO();
  const data = await getDashboardData(supabase, today, monthRange(today));

  return (
    <>
      <PageHeader title="Dashboard" description="Visao geral da sua operacao." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Pacientes" value={data.totalPatients} icon={Users} />
        <SummaryCard label="Sessoes hoje" value={data.sessionsToday} icon={CalendarCheck} />
        <SummaryCard
          label="Pagamentos pendentes"
          value={formatCurrency(data.pendingTotal)}
          hint={`${data.pendingCount} sessao(oes)`}
          icon={Wallet}
        />
        <SummaryCard label="Faltas no mes" value={data.noShowsThisMonth} icon={UserX} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Proximas sessoes</h2>
            <Link href="/sessions" className="text-sm text-brand-700 hover:underline">
              Ver todas
            </Link>
          </div>
          {data.upcomingSessions.length === 0 ? (
            <EmptyState
              title="Nenhuma sessao agendada"
              description="As proximas sessoes agendadas aparecem aqui."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcomingSessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {s.patient?.name ?? "Paciente removido"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(s.session_date)} as {formatTime(s.session_time)}
                    </p>
                  </div>
                  <span className="text-sm text-slate-600">{formatCurrency(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Pagamentos pendentes recentes</h2>
            <Link href="/financial" className="text-sm text-brand-700 hover:underline">
              Financeiro
            </Link>
          </div>
          {data.recentPending.length === 0 ? (
            <EmptyState
              title="Nenhum pagamento pendente"
              description="Tudo em dia por aqui."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentPending.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {s.patient?.name ?? "Paciente removido"}
                    </p>
                    <p className="text-sm text-slate-500">{formatDate(s.session_date)}</p>
                  </div>
                  <span className="text-sm font-medium text-amber-700">
                    {formatCurrency(s.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
