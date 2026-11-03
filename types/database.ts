import type {
  BillingType,
  CancelledBy,
  PaymentStatus,
  SessionStatus,
} from "@/types/domain";

/** Dados enviados ao criar/editar um paciente. */
export interface PatientInput {
  name: string;
  phone: string | null;
  email: string | null;
  session_price: number;
  billing_type: BillingType;
  notes: string | null;
}

/** Dados enviados ao criar/editar uma sessao. */
export interface SessionInput {
  patient_id: string;
  session_date: string;
  session_time: string;
  status: SessionStatus;
  payment_status: PaymentStatus;
  amount: number;
  cancelled_by: CancelledBy | null;
  cancelled_at: string | null;
  cancellation_fee_applies: boolean;
}
