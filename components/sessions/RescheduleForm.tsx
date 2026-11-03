"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/supabase/client";
import { rescheduleSession } from "@/services/sessions";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, formatDate, formatTime, todayISO } from "@/lib/utils";
import type { SessionWithPatient } from "@/types/domain";

interface Props {
  userId: string;
  /** Sessao cancelada pelo psicologo que sera remarcada. */
  session: SessionWithPatient;
  /** Valor normal da sessao do paciente (a remarcacao nao tem custo extra). */
  amount: number;
  onSaved: () => void;
  onCancel: () => void;
}

export function RescheduleForm({ userId, session, amount, onSaved, onCancel }: Props) {
  const { notify } = useToast();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(session.session_time.slice(0, 5));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!date) return setError("Informe a nova data.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return setError("Informe um horario valido.");

    setSaving(true);
    try {
      await rescheduleSession(createClient(), userId, {
        originalId: session.id,
        patientId: session.patient_id,
        date,
        time,
        amount,
      });
      notify("success", "Sessao remarcada sem onus.");
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-slate-600">
        A sessao de {session.patient?.name ?? "paciente"} em{" "}
        {formatDate(session.session_date)} as {formatTime(session.session_time)} foi cancelada
        pelo psicologo. A remarcacao nao gera cobranca adicional.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-date" className="label">
            Nova data *
          </label>
          <input
            id="r-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="r-time" className="label">
            Novo horario *
          </label>
          <input
            id="r-time"
            type="time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

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
          Remarcar sessao
        </button>
      </div>
    </form>
  );
}
