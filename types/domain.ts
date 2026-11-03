export type BillingType = "per_session" | "monthly";
export type SessionStatus = "scheduled" | "completed" | "no_show" | "cancelled";
export type PaymentStatus = "pending" | "paid";
export type CancelledBy = "patient" | "psychologist";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  session_price: number;
  billing_type: BillingType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  patient_id: string;
  session_date: string; // YYYY-MM-DD
  session_time: string; // HH:MM
  status: SessionStatus;
  payment_status: PaymentStatus;
  amount: number;
  cancelled_by: CancelledBy | null;
  cancelled_at: string | null; // timestamptz (ISO)
  /** true = cancelamento tardio do paciente, sessao cobrada */
  cancellation_fee_applies: boolean;
  /** id da sessao criada na remarcacao (cancelamento pelo psicologo) */
  rescheduled_to_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Sessao com o nome do paciente (join). */
export interface SessionWithPatient extends Session {
  patient: { name: string } | null;
}
