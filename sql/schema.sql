-- =====================================================================
-- schema.sql  |  Execute primeiro no SQL Editor do Supabase
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  session_price numeric(10,2) not null default 0,
  billing_type text not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint patients_billing_type_check
    check (billing_type in ('per_session', 'monthly')),
  constraint patients_session_price_check
    check (session_price >= 0)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  session_date date not null,
  session_time text not null,
  status text not null,
  payment_status text not null,
  amount numeric(10,2) not null default 0,
  -- Politica de cancelamento
  cancelled_by text,
  cancelled_at timestamptz,
  cancellation_fee_applies boolean not null default false,
  rescheduled_to_id uuid references public.sessions (id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint sessions_cancelled_by_check
    check (cancelled_by is null or cancelled_by in ('patient', 'psychologist')),
  constraint sessions_cancellation_fields_check
    check (
      status = 'cancelled'
      or (
        cancelled_by is null
        and cancelled_at is null
        and cancellation_fee_applies = false
        and rescheduled_to_id is null
      )
    ),
  -- cancelamento feito pelo psicologo nunca gera cobranca
  constraint sessions_fee_only_patient_check
    check (not cancellation_fee_applies or cancelled_by = 'patient'),
  constraint sessions_status_check
    check (status in ('scheduled', 'completed', 'no_show', 'cancelled')),
  constraint sessions_payment_status_check
    check (payment_status in ('pending', 'paid')),
  constraint sessions_time_format_check
    check (session_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint sessions_amount_check
    check (amount >= 0)
);

-- ---------------------------------------------------------------------
-- Indices
-- ---------------------------------------------------------------------

create index if not exists patients_user_id_idx on public.patients (user_id);
create index if not exists patients_user_name_idx on public.patients (user_id, name);
create index if not exists sessions_user_date_idx on public.sessions (user_id, session_date);
create index if not exists sessions_patient_idx on public.sessions (patient_id);
create index if not exists sessions_user_payment_idx on public.sessions (user_id, payment_status);

-- ---------------------------------------------------------------------
-- updated_at automatico
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_patients_updated_at on public.patients;
create trigger set_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

drop trigger if exists set_sessions_updated_at on public.sessions;
create trigger set_sessions_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Criacao automatica do profile no signup
-- (o app tambem faz um upsert de seguranca apos o cadastro)
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
