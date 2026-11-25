-- Mapa do site (sitemap.xml): lista só o que já é público (loja aprovada, item
-- aprovado de loja aprovada, vitrine publicada). Nenhum dado pessoal: só endereço e data.
create or replace function public.mapa_do_site()
returns table (tipo text, slug text, loja_slug text, atualizado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select 'loja'::text, p.loja_slug, null::text, p.atualizado_em
    from public.producers p where p.status_verificacao = 'aprovado' and p.loja_slug is not null
  union all
  select 'produto', i.slug, p.loja_slug, i.atualizado_em
    from public.items i join public.producers p on p.id = i.producer_id
    where p.status_verificacao = 'aprovado' and p.loja_slug is not null and i.status_aprovacao = 'aprovado'
  union all
  select 'vitrine', s.slug, null, s.atualizado_em from public.storefronts s where s.publicada;
$$;
revoke execute on function public.mapa_do_site() from public;
grant execute on function public.mapa_do_site() to anon, authenticated, service_role;
