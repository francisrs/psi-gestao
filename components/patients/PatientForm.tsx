"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/supabase/client";
import { createPatient, updatePatient } from "@/services/patients";
import { useToast } from "@/components/ui/Toast";
import {
  BILLING_LABELS,
  BILLING_TYPES,
  errorMessage,
  parseMoney,
} from "@/lib/utils";
import type { BillingType, Patient } from "@/types/domain";

interface Props {
  userId: string;
  patient?: Patient | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function PatientForm({ userId, patient, onSaved, onCancel }: Props) {
  const { notify } = useToast();
  const [name, setName] = useState(patient?.name ?? "");
  const [phone, setPhone] = useState(patient?.phone ?? "");
  const [email, setEmail] = useState(patient?.email ?? "");
  const [price, setPrice] = useState(
    patient ? String(patient.session_price).replace(".", ",") : ""
  );
  const [billingType, setBillingType] = useState<BillingType>(
    patient?.billing_type ?? "per_session"
  );
  const [notes, setNotes] = useState(patient?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) return setError("Informe o nome do paciente.");

    const priceValue = price.trim() === "" ? 0 : parseMoney(price);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      return setError("Informe um valor de sessao valido.");
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      return setError("Informe um e-mail valido.");
    }

    const input = {
      name: trimmedName,
      phone: phone.trim() || null,
      email: trimmedEmail || null,
      session_price: priceValue,
      billing_type: billingType,
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      const supabase = createClient();
      if (patient) {
        await updatePatient(supabase, patient.id, input);
        notify("success", "Paciente atualizado.");
      } else {
        await createPatient(supabase, userId, input);
        notify("success", "Paciente cadastrado.");
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
        <label htmlFor="p-name" className="label">
          Nome *
        </label>
        <input
          id="p-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-phone" className="label">
            Telefone
          </label>
          <input
            id="p-phone"
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="p-email" className="label">
            E-mail
          </label>
          <input
            id="p-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-price" className="label">
            Valor da sessao (R$)
          </label>
          <input
            id="p-price"
            className="input"
            inputMode="decimal"
            placeholder="0,00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="p-billing" className="label">
            Tipo de cobranca
          </label>
          <select
            id="p-billing"
            className="input"
            value={billingType}
            onChange={(e) => setBillingType(e.target.value as BillingType)}
          >
            {BILLING_TYPES.map((type) => (
              <option key={type} value={type}>
                {BILLING_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="p-notes" className="label">
          Observacoes administrativas
        </label>
        <textarea
          id="p-notes"
          className="input min-h-[80px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: preferencia de horario, forma de pagamento"
        />
        <p className="mt-1 text-xs text-slate-400">
          Nao registre informacoes clinicas neste campo.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {patient ? "Salvar alteracoes" : "Cadastrar paciente"}
        </button>
      </div>
    </form>
  );
}
