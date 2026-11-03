-- =====================================================================
-- migration_001_cancellation.sql
-- Somente para bancos JA criados com a versao anterior do schema.sql.
-- (Instalacoes novas ja recebem estas colunas pelo schema.sql.)
-- =====================================================================

alter table public.sessions
  add column if not exists cancelled_by text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_fee_applies boolean not null default false,
  add column if not exists rescheduled_to_id uuid references public.sessions (id) on delete set null;

alter table public.sessions drop constraint if exists sessions_cancelled_by_check;
alter table public.sessions add constraint sessions_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('patient', 'psychologist'));

alter table public.sessions drop constraint if exists sessions_cancellation_fields_check;
alter table public.sessions add constraint sessions_cancellation_fields_check
  check (
    status = 'cancelled'
    or (
      cancelled_by is null
      and cancelled_at is null
      and cancellation_fee_applies = false
      and rescheduled_to_id is null
    )
  );

-- cancelamento feito pelo psicologo nunca gera cobranca
alter table public.sessions drop constraint if exists sessions_fee_only_patient_check;
alter table public.sessions add constraint sessions_fee_only_patient_check
  check (not cancellation_fee_applies or cancelled_by = 'patient');
