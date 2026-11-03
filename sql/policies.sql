-- =====================================================================
-- policies.sql  |  Execute depois do schema.sql
-- Cada usuario autenticado enxerga e altera apenas os proprios dados.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.sessions enable row level security;

-- ---------------------------------------------------------------------
-- profiles (chave = id do usuario)
-- ---------------------------------------------------------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------
-- patients (chave = user_id)
-- ---------------------------------------------------------------------

drop policy if exists "patients_select_own" on public.patients;
create policy "patients_select_own" on public.patients
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "patients_insert_own" on public.patients;
create policy "patients_insert_own" on public.patients
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "patients_update_own" on public.patients;
create policy "patients_update_own" on public.patients
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "patients_delete_own" on public.patients;
create policy "patients_delete_own" on public.patients
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- sessions (chave = user_id; paciente tambem precisa ser do usuario)
-- ---------------------------------------------------------------------

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own" on public.sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.patients p
      where p.id = patient_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own" on public.sessions
  for delete to authenticated
  using (user_id = auth.uid());
