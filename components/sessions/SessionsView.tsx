"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/supabase/client";
import { deleteSession } from "@/services/sessions";
import { SessionForm, type PatientOption } from "@/components/sessions/SessionForm";
import { RescheduleForm } from "@/components/sessions/RescheduleForm";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CancellationNote,
  SessionPaymentBadge,
  SessionStatusBadge,
} from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  SESSION_STATUSES,
  SESSION_STATUS_LABELS,
  errorMessage,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/utils";
import type { SessionStatus, SessionWithPatient } from "@/types/domain";

interface Props {
  userId: string;
  sessions: SessionWithPatient[];
  patients: PatientOption[];
  filters: { patientId: string; status: SessionStatus | "" };
}

export function SessionsView({ userId, sessions, patients, filters }: Props) {
  const router = useRouter();
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SessionWithPatient | null>(null);
  const [deleting, setDeleting] = useState<SessionWithPatient | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState<SessionWithPatient | null>(null);

  /** Cancelada pelo psicologo e ainda sem nova data: pode ser remarcada sem onus. */
  function canReschedule(s: SessionWithPatient): boolean {
    return (
      s.status === "cancelled" &&
      s.cancelled_by === "psychologist" &&
      !s.rescheduled_to_id
    );
  }

  const hasFilter = Boolean(filters.patientId || filters.status);
  const noPatients = patients.length === 0;

  function applyFilters(next: { patientId: string; status: string }) {
    const params = new URLSearchParams();
    if (next.patientId) params.set("patient", next.patientId);
    if (next.status) params.set("status", next.status);
    const qs = params.toString();
    router.replace(qs ? `/sessions?${qs}` : "/sessions");
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(session: SessionWithPatient) {
    setEditing(session);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteSession(createClient(), deleting.id);
      notify("success", "Sessao excluida.");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      notify("error", errorMessage(e));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Sessoes"
        description="Agenda, status e pagamento de cada sessao."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate} disabled={noPatients}>
            <Plus className="h-4 w-4" aria-hidden />
            Nova sessao
          </button>
        }
      />

      {noPatients && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Cadastre um paciente antes de registrar sessoes.{" "}
          <Link href="/patients" className="font-medium underline">
            Ir para pacientes
          </Link>
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="f-patient" className="label">
            Paciente
          </label>
          <select
            id="f-patient"
            className="input"
            value={filters.patientId}
            onChange={(e) => applyFilters({ patientId: e.target.value, status: filters.status })}
          >
            <option value="">Todos</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className="label">
            Status
          </label>
          <select
            id="f-status"
            className="input"
            value={filters.status}
            onChange={(e) => applyFilters({ patientId: filters.patientId, status: e.target.value })}
          >
            <option value="">Todos</option>
            {SESSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SESSION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {sessions.length === 0 ? (
          <EmptyState
            title={hasFilter ? "Nenhuma sessao encontrada" : "Nenhuma sessao registrada"}
            description={
              hasFilter
                ? "Ajuste os filtros para ver outras sessoes."
                : "Registre a primeira sessao para acompanhar sua agenda."
            }
          />
        ) : (
          <>
            {/* Tabela (tablet/desktop) */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDate(s.session_date)} · {formatTime(s.session_time)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/patients/${s.patient_id}`} className="hover:text-brand-700 hover:underline">
                        {s.patient?.name ?? "Paciente removido"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <SessionStatusBadge status={s.status} />
                      <div className="mt-1">
                        <CancellationNote session={s} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SessionPaymentBadge session={s} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(s.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canReschedule(s) && (
                          <button type="button" className="btn-ghost text-brand-700" onClick={() => setRescheduling(s)} aria-label="Remarcar sessao">
                            <CalendarClock className="h-4 w-4" />
                          </button>
                        )}
                        <button type="button" className="btn-ghost" onClick={() => openEdit(s)} aria-label="Editar sessao">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => setDeleting(s)} aria-label="Excluir sessao">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cards (mobile) */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {sessions.map((s) => (
                <li key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{s.patient?.name ?? "Paciente removido"}</p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {formatDate(s.session_date)} · {formatTime(s.session_time)} · {formatCurrency(s.amount)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {canReschedule(s) && (
                        <button type="button" className="btn-ghost text-brand-700" onClick={() => setRescheduling(s)} aria-label="Remarcar sessao">
                          <CalendarClock className="h-4 w-4" />
                        </button>
                      )}
                      <button type="button" className="btn-ghost" onClick={() => openEdit(s)} aria-label="Editar sessao">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => setDeleting(s)} aria-label="Excluir sessao">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <SessionStatusBadge status={s.status} />
                    <SessionPaymentBadge session={s} />
                  </div>
                  <div className="mt-1">
                    <CancellationNote session={s} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? "Editar sessao" : "Nova sessao"} onClose={closeForm}>
          <SessionForm
            userId={userId}
            patients={patients}
            session={editing}
            defaultPatientId={filters.patientId || undefined}
            onCancel={closeForm}
            onSaved={() => {
              closeForm();
              router.refresh();
            }}
          />
        </Modal>
      )}

      {rescheduling && (
        <Modal title="Remarcar sessao" onClose={() => setRescheduling(null)}>
          <RescheduleForm
            userId={userId}
            session={rescheduling}
            amount={
              patients.find((p) => p.id === rescheduling.patient_id)?.session_price ?? 0
            }
            onCancel={() => setRescheduling(null)}
            onSaved={() => {
              setRescheduling(null);
              router.refresh();
            }}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir sessao"
          message={`Excluir a sessao de ${deleting.patient?.name ?? "paciente"} em ${formatDate(deleting.session_date)}? Esta acao nao pode ser desfeita.`}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
