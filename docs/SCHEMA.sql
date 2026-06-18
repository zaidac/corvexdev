-- =========================================================
-- CorvexDev — Schema y policies de Supabase
-- Pegar este archivo entero en Supabase → SQL Editor → New query → Run
-- =========================================================

-- Extensión necesaria para gen_random_uuid()
create extension if not exists "pgcrypto";


-- ---------- 1. Tabla projects ----------

create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 120),
  description   text not null check (char_length(description) between 1 and 1000),
  link          text not null check (link ~* '^https?://'),
  image_url     text not null,
  tags          text[] not null default '{}',
  display_order int  not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_read_order_idx
  on public.projects (is_published, display_order, created_at desc);


-- ---------- 2. Trigger para updated_at ----------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();


-- ---------- 3. RLS en projects ----------

alter table public.projects enable row level security;

-- Lectura pública solo de proyectos publicados
drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read"
  on public.projects for select
  to anon, authenticated
  using (is_published = true);

-- Lectura total (incluye no publicados) para usuarios autenticados
-- (se acumula con la policy anterior vía OR; permite que el admin vea todo)
drop policy if exists "projects_auth_read_all" on public.projects;
create policy "projects_auth_read_all"
  on public.projects for select
  to authenticated
  using (true);

-- Escritura (INSERT / UPDATE / DELETE) solo para usuarios autenticados
drop policy if exists "projects_auth_write" on public.projects;
create policy "projects_auth_write"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);


-- =========================================================
-- NOTA sobre Storage: la creación del bucket y sus policies
-- se hace en dos pasos separados porque Supabase separa la
-- configuración del bucket (UI) de las policies de Storage (SQL).
--
-- Paso A (UI):  Storage → New bucket → name = "project-images",
--               Public = ON, file size limit = 2 MB,
--               allowed MIME = image/png, image/jpeg, image/webp
--
-- Paso B (SQL): correr el bloque de abajo UNA VEZ creado el bucket.
-- =========================================================


-- ---------- 4. Policies del bucket project-images ----------

drop policy if exists "project_images_public_read" on storage.objects;
create policy "project_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-images');

drop policy if exists "project_images_auth_upload" on storage.objects;
create policy "project_images_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images');

drop policy if exists "project_images_auth_update" on storage.objects;
create policy "project_images_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images')
  with check (bucket_id = 'project-images');

drop policy if exists "project_images_auth_delete" on storage.objects;
create policy "project_images_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images');


-- =========================================================
-- 5. Usuario admin
-- =========================================================
-- Esto NO se hace desde SQL. Hay que ir a:
--   Authentication → Users → Add user → Create new user
--   Email: tu email
--   Password: una contraseña fuerte
--   Auto Confirm User: ON (para no tener que confirmar por mail)
-- =========================================================