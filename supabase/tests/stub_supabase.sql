-- =========================================================================
-- SÓ PARA TESTE LOCAL. NÃO rode isto no Supabase.
-- Imita o mínimo do Supabase (papéis, auth.users, auth.uid(), storage)
-- para testar a migração num Postgres comum.
-- =========================================================================

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

grant usage on schema public to anon, authenticated, service_role;

-- O Supabase dá acesso total por padrão em tabelas novas; imitamos isso
-- para provar que a migração tira o que não deve ficar.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- auth
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  -- como no Supabase: preenchido quando a pessoa confirma o e-mail
  email_confirmed_at timestamptz default now(),
  raw_user_meta_data jsonb,
  -- como no Supabase
  created_at         timestamptz default now(),
  last_sign_in_at    timestamptz
);

create function auth.uid() returns uuid
language sql stable as $$
  -- visitante (claims vazias) → null, como no Supabase
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;

-- storage
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text not null
);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated, service_role;

create function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
