"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/supabase/client";
import { createSession, rescheduleSession, updateSession } from "@/services/sessions";
import { useToast } from "@/components/ui/Toast";
import {
  APP_TIMEZONE,
  CANCELLED_BY_LABELS,
  CANCELLED_BY_OPTIONS,
  LATE_CANCEL_HOURS,
  PAYMENT_LABELS,
  PAYMENT_STATUSES,
  SESSION_STATUSES,
  SESSION_STATUS_LABELS,
  cancellationNoticeHours,
  errorMessage,
  nowTimeISO,
  parseMoney,
  todayISO,
  zonedDateTimeToMs,
} from "@/lib/utils";
import type {
  CancelledBy,
  PaymentStatus,
  SessionStatus,
  SessionWithPatient,
} from "@/types/domain";

export interface PatientOption {
  id: string;
  name: string;
  session_price: number;
}

interface Props {
  userId: string;
  patients: PatientOption[];
  session?: SessionWithPatient | null;
  defaultPatientId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

/** "2025-03-09T14:30:00+00:00" -> { date, time } no fuso do app. */
function splitInstant(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return { date, time };
}

export function SessionForm({
  userId,
  patients,
  session,
  defaultPatientId,
  onSaved,
  onCancel,
}: Props) {
  const { notify } = useToast();
  const initialPatientId = session?.patient_id ?? defaultPatientId ?? patients[0]?.id ?? "";
  const initialPatient = patients.find((p) => p.id === initialPatientId);

  const [patientId, setPatientId] = useState(initialPatientId);
  const [date, setDate] = useState(session?.session_date ?? todayISO());
  const [time, setTime] = useState(session ? session.session_time.slice(0, 5) : "09:00");
  const [status, setStatus] = useState<SessionStatus>(session?.status ?? "scheduled");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    session?.payment_status ?? "pending"
  );
  const [amount, setAmount] = useState(
    session && session.amount > 0
      ? String(session.amount).replace(".", ",")
      : initialPatient
      ? String(initialPatient.session_price).replace(".", ",")
      : ""
  );

  // --- cancelamento ---
  const initialCancel = session?.cancelled_at ? splitInstant(session.cancelled_at) : null;
  const [cancelledBy, setCancelledBy] = useState<CancelledBy>(
    session?.cancelled_by ?? "patient"
  );
  const [cancelDate, setCancelDate] = useState(initialCancel?.date ?? todayISO());
  const [cancelTime, setCancelTime] = useState(initialCancel?.time ?? nowTimeISO());
  const [feeTouched, setFeeTouched] = useState(Boolean(session?.cancelled_by));
  const [feeManual, setFeeManual] = useState(session?.cancellation_fee_applies ?? false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isCancelled = status === "cancelled";
  const alreadyRescheduled = Boolean(session?.rescheduled_to_id);

  // Horas de antecedencia e sugestao automatica de cobranca
  const noticeHours = useMemo(() => {
    if (!isCancelled || !date || !time || !cancelDate || !cancelTime) return null;
    try {
      return cancellationNoticeHours(date, time, cancelDate, cancelTime);
    } catch {
      return null;
    }
  }, [isCancelled, date, time, cancelDate, cancelTime]);

  const suggestedFee =
    cancelledBy === "patient" && noticeHours !== null && noticeHours < LATE_CANCEL_HOURS;

  // Psicologo cancelando nunca cobra; para o paciente, segue a sugestao ate o usuario alterar.
  const chargeFee =
    cancelledBy === "psychologist" ? false : feeTouched ? feeManual : suggestedFee;

  function handlePatientChange(id: string) {
    setPatientId(id);
    // ao criar, sugere o valor padrao do paciente selecionado
    if (!session) {
      const patient = patients.find((p) => p.id === id);
      if (patient) setAmount(String(patient.session_price).replace(".", ","));
    }
  }

  function formatNotice(hours: number): string {
    if (hours < 0) return "o cancelamento foi feito depois do horario da sessao";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h} h${m > 0 ? ` ${m} min` : ""} de antecedencia`;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!patientId) return setError("Selecione um paciente.");
    if (!date) return setError("Informe a data da sessao.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return setError("Informe um horario valido.");

    const amountValue = amount.trim() === "" ? 0 : parseMoney(amount);
    if (Number.isNaN(amountValue) || amountValue < 0) {
      return setError("Informe um valor valido.");
    }

    let cancelledAt: string | null = null;
    if (isCancelled) {
      if (!cancelDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(cancelTime)) {
        return setError("Informe quando o cancelamento foi comunicado.");
      }
      cancelledAt = new Date(zonedDateTimeToMs(cancelDate, cancelTime)).toISOString();

      if (cancelledBy === "patient" && chargeFee && amountValue <= 0) {
        return setError("Informe o valor a ser cobrado pelo cancelamento tardio.");
      }
    }

    const wantsReschedule =
      isCancelled &&
      cancelledBy === "psychologist" &&
      !alreadyRescheduled &&
      (rescheduleDate !== "" || rescheduleTime !== "");
    if (wantsReschedule) {
      if (!rescheduleDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(rescheduleTime)) {
        return setError("Para remarcar, informe a nova data e o novo horario.");
      }
    }

    // Regra de cobranca: so cobra quando o paciente cancelou tarde.
    // Cancelamentos sem cobranca ficam com valor zero e nao entram no financeiro.
    const input = {
      patient_id: patientId,
      session_date: date,
      session_time: time,
      status,
      payment_status: isCancelled && !chargeFee ? ("pending" as PaymentStatus) : paymentStatus,
      amount: isCancelled && !chargeFee ? 0 : amountValue,
      cancelled_by: isCancelled ? cancelledBy : null,
      cancelled_at: cancelledAt,
      cancellation_fee_applies: isCancelled ? chargeFee : false,
    };

    setSaving(true);
    try {
      const supabase = createClient();
      let savedId: string;

      if (session) {
        await updateSession(supabase, session.id, input);
        savedId = session.id;
      } else {
        savedId = await createSession(supabase, userId, input);
      }

      if (wantsReschedule) {
        await rescheduleSession(supabase, userId, {
          originalId: savedId,
          patientId,
          date: rescheduleDate,
          time: rescheduleTime,
          amount: amountValue,
        });
        notify("success", "Sessao cancelada e remarcada sem onus.");
      } else {
        notify("success", session ? "Sessao atualizada." : "Sessao registrada.");
      }
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="s-patient" className="label">
          Paciente *
        </label>
        <select
          id="s-patient"
          className="input"
          value={patientId}
          onChange={(e) => handlePatientChange(e.target.value)}
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s-date" className="label">
            Data *
          </label>
          <input
            id="s-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="s-time" className="label">
            Hora *
          </label>
          <input
            id="s-time"
            type="time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s-status" className="label">
            Status da sessao
          </label>
          <select
            id="s-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as SessionStatus)}
          >
            {SESSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SESSION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="s-payment" className="label">
            Pagamento
          </label>
          <select
            id="s-payment"
            className="input"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
            disabled={isCancelled && !chargeFee}
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="s-amount" className="label">
          Valor da sessao (R$)
        </label>
        <input
          id="s-amount"
          className="input"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {isCancelled && (
        <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Cancelamento
          </legend>

          <div>
            <label htmlFor="s-cancelled-by" className="label">
              Quem cancelou?
            </label>
            <select
              id="s-cancelled-by"
              className="input"
              value={cancelledBy}
              onChange={(e) => setCancelledBy(e.target.value as CancelledBy)}
            >
              {CANCELLED_BY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CANCELLED_BY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-cancel-date" className="label">
                Cancelado em (data)
              </label>
              <input
                id="s-cancel-date"
                type="date"
                className="input"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="s-cancel-time" className="label">
                Cancelado em (hora)
              </label>
              <input
                id="s-cancel-time"
                type="time"
                className="input"
                value={cancelTime}
                onChange={(e) => setCancelTime(e.target.value)}
              />
            </div>
          </div>

          {cancelledBy === "patient" ? (
            <div className="space-y-2">
              {noticeHours !== null && (
                <p className="text-sm text-slate-600">
                  Aviso: {formatNotice(noticeHours)}.{" "}
                  {suggestedFee
                    ? `Menos de ${LATE_CANCEL_HOURS} h: cobranca sugerida.`
                    : `${LATE_CANCEL_HOURS} h ou mais: sem cobranca.`}
                </p>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={chargeFee}
                  onChange={(e) => {
                    setFeeTouched(true);
                    setFeeManual(e.target.checked);
                  }}
                />
                Cobrar esta sessao (cancelamento tardio)
              </label>
            </div>
          ) : (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Cancelamento pelo psicologo: sem cobranca. A sessao pode ser remarcada sem onus.
            </p>
          )}

          {cancelledBy === "psychologist" && !alreadyRescheduled && (
            <div>
              <p className="label">Remarcar para (opcional)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="date"
                  className="input"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  aria-label="Nova data"
                />
                <input
                  type="time"
                  className="input"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  aria-label="Novo horario"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Deixe em branco para remarcar depois pela lista de sessoes.
              </p>
            </div>
          )}
          {cancelledBy === "psychologist" && alreadyRescheduled && (
            <p className="text-sm text-slate-500">Esta sessao ja foi remarcada.</p>
          )}
        </fieldset>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {session ? "Salvar alteracoes" : "Registrar sessao"}
        </button>
      </div>
    </form>
  );
}
