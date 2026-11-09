-- Staypse: tabelas da lista de espera.
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Pode rodar de novo sem problema: nada é apagado.

-- Afiliados ---------------------------------------------------------------
create table if not exists public.afiliados (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  nome       text not null check (char_length(nome) between 1 and 120),
  email      text not null unique
             check (char_length(email) <= 254
                    and email = lower(email)
                    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp   text check (char_length(whatsapp) <= 30),
  canal      text not null
             check (canal in ('Instagram', 'TikTok', 'WhatsApp', 'Tráfego pago', 'Outro'))
);

-- Fábricas ----------------------------------------------------------------
create table if not exists public.fabricas (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  nome       text not null check (char_length(nome) between 1 and 120),
  fabrica    text not null check (char_length(fabrica) between 1 and 160),
  email      text not null unique
             check (char_length(email) <= 254
                    and email = lower(email)
                    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp   text check (char_length(whatsapp) <= 30),
  cidade     text not null check (char_length(cidade) between 1 and 120),
  produtos   text not null check (char_length(produtos) between 1 and 1000)
);

-- Segurança ----------------------------------------------------------------
-- A página só pode CADASTRAR. Ninguém de fora consegue ler, editar ou apagar.
-- Você vê os dados pelo painel do Supabase (Table Editor).
alter table public.afiliados enable row level security;
alter table public.fabricas  enable row level security;

drop policy if exists "pagina pode cadastrar" on public.afiliados;
create policy "pagina pode cadastrar" on public.afiliados
  for insert to anon with check (true);

drop policy if exists "pagina pode cadastrar" on public.fabricas;
create policy "pagina pode cadastrar" on public.fabricas
  for insert to anon with check (true);
