-- =========================================================================
-- STAYPSE — Etapa 6: lista de espera com os 4 perfis do pré-lançamento
-- =========================================================================
-- Perfis NOVOS (coluna waitlist.interesse):
--   loja       = "Tenho loja/fábrica"   (antes: produtor)
--   vendedor   = "Trabalho em loja"     (novo)
--   afiliado   = "Quero ser afiliado"   (antes: revendedor)
--   comprador  = "Quero comprar"        (continua igual)
-- As inscrições antigas são PRESERVADAS: só o rótulo do perfil é convertido.
-- Nada de migração antiga foi alterado.
-- Como aplicar: supabase db push (ou SQL Editor). NÃO aplicar em produção
-- sem autorização.
-- =========================================================================


-- =========================================================================
-- 1. TRADUÇÃO DOS PERFIS ANTIGOS
-- =========================================================================
create or replace function public.perfil_lista_novo(p text)
returns text
language sql immutable
set search_path = ''
as $$
  select case p
    when 'revendedor' then 'afiliado'
    when 'produtor'   then 'loja'
    else p
  end;
$$;
revoke execute on function public.perfil_lista_novo(text) from public, anon, authenticated;
grant execute on function public.perfil_lista_novo(text) to service_role;


-- =========================================================================
-- 2. CONSTRAINTS E DADOS
-- =========================================================================
alter table public.waitlist drop constraint if exists waitlist_interesse_check;
alter table public.waitlist drop constraint if exists waitlist_campos_obrigatorios;

-- converte quem já estava na lista (revendedor → afiliado, produtor → loja)
update public.waitlist
set interesse = public.perfil_lista_novo(interesse)
where interesse in ('revendedor', 'produtor');

alter table public.waitlist add constraint waitlist_interesse_check
  check (interesse in ('loja', 'vendedor', 'afiliado', 'comprador'));

-- Campos obrigatórios por perfil. "not valid" = vale para as inscrições
-- novas, sem travar linhas muito antigas (de antes da Etapa 2).
alter table public.waitlist add constraint waitlist_campos_obrigatorios check (
  consentimento_versao is not null
  and nome is not null and char_length(nome) >= 2
  -- WhatsApp: obrigatório para loja e afiliado (contato comercial);
  -- opcional para vendedor de loja e comprador
  and (interesse in ('vendedor', 'comprador') or whatsapp is not null)
  and (interesse <> 'afiliado'
       or (cidade is not null and uf is not null and cardinality(nichos) >= 1))
  and (interesse <> 'loja'
       or (empresa is not null and tipo_produto is not null and o_que_vende is not null))
  -- vendedor: informa em qual loja trabalha (campo "empresa")
  and (interesse <> 'vendedor' or empresa is not null)
) not valid;

-- Quando enviamos (ou reenviamos) o e-mail com o link da posição. Limita o
-- reenvio para ninguém usar o formulário para lotar a caixa de outra pessoa.
alter table public.waitlist add column ultimo_envio_em timestamptz;


-- =========================================================================
-- 3. INSCRIÇÃO (só pelo servidor)
-- =========================================================================
-- Mudou o retorno (antes: só o código), então a função é recriada.
--  * e-mail novo  → grava e devolve (codigo, novo = true, reenviar = true)
--  * e-mail já na lista → NÃO cria outra linha; devolve o código existente
--    com novo = false. "reenviar" só é true se o último e-mail foi há mais
--    de 10 minutos. O site NÃO mostra a posição de quem já existe: só manda
--    o link para o próprio e-mail (quem digitou o e-mail de outra pessoa
--    não descobre nada).
drop function public.inscrever_na_lista(jsonb, text);
create function public.inscrever_na_lista(p jsonb, p_ip_hash text)
returns table (codigo text, novo boolean, reenviar boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  limite_por_hora constant int := 5;
  intervalo_reenvio constant interval := interval '10 minutes';
  v_email text := lower(trim(p ->> 'email'));
  v_indicado_por bigint;
  v_codigo text;
  v_id bigint;
  v_ultimo timestamptz;
begin
  -- e-mail já inscrito
  select w.id, w.codigo_indicacao, w.ultimo_envio_em into v_id, v_codigo, v_ultimo
  from public.waitlist w where w.email = v_email;
  if found then
    if v_ultimo is null or v_ultimo < now() - intervalo_reenvio then
      update public.waitlist set ultimo_envio_em = now() where id = v_id;
      return query select v_codigo, false, true;
      return;
    end if;
    return query select v_codigo, false, false;
    return;
  end if;

  if p_ip_hash is not null and (
       select count(*) from public.waitlist
       where ip_hash = p_ip_hash and criado_em > now() - interval '1 hour'
     ) >= limite_por_hora then
    raise exception 'limite_por_ip';
  end if;

  -- código de quem indicou (se não existir, ignora)
  select id into v_indicado_por
  from public.waitlist
  where codigo_indicacao = nullif(trim(p ->> 'ref'), '');

  insert into public.waitlist (
    email, nome, interesse, whatsapp, cidade, uf, nichos,
    empresa, cnpj, tipo_produto, o_que_vende,
    indicado_por, ip_hash, consentimento_versao, ultimo_envio_em
  ) values (
    v_email,
    nullif(trim(p ->> 'nome'), ''),
    p ->> 'interesse',
    nullif(p ->> 'whatsapp', ''),
    nullif(trim(p ->> 'cidade'), ''),
    nullif(p ->> 'uf', ''),
    coalesce(array(select jsonb_array_elements_text(
               case when jsonb_typeof(p -> 'nichos') = 'array' then p -> 'nichos' else '[]'::jsonb end)),
             '{}'),
    nullif(trim(p ->> 'empresa'), ''),
    nullif(p ->> 'cnpj', ''),
    nullif(p ->> 'tipo_produto', ''),
    nullif(trim(p ->> 'o_que_vende'), ''),
    v_indicado_por,
    p_ip_hash,
    nullif(p ->> 'consentimento_versao', ''),
    now()
  )
  on conflict (email) do nothing
  returning codigo_indicacao into v_codigo;

  if v_codigo is null then
    -- duas inscrições simultâneas com o mesmo e-mail: a outra venceu
    select w.codigo_indicacao into v_codigo from public.waitlist w where w.email = v_email;
    return query select v_codigo, false, false;
    return;
  end if;

  return query select v_codigo, true, true;
end;
$$;
revoke execute on function public.inscrever_na_lista(jsonb, text) from public, anon, authenticated;
grant execute on function public.inscrever_na_lista(jsonb, text) to service_role;


-- =========================================================================
-- 4. ADMIN: resumo da lista com os perfis novos
-- =========================================================================
create or replace function public.admin_lista_espera_resumo(p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  return jsonb_build_object(
    'total', (select count(*) from public.waitlist),
    'no_periodo', (select count(*) from public.waitlist where criado_em >= p_inicio and criado_em < p_fim),
    -- por perfil (interesse), desde o começo
    'por_perfil', coalesce((select jsonb_agg(jsonb_build_object('perfil', interesse, 'total', n) order by n desc)
                            from (select interesse, count(*) n from public.waitlist group by interesse) x), '[]'),
    -- crescimento por dia (dia de Brasília), com dias sem inscrição zerados
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object(
               'dia', to_char(d.dia, 'YYYY-MM-DD'),
               'loja', coalesce(c.loja, 0), 'vendedor', coalesce(c.vendedor, 0),
               'afiliado', coalesce(c.afiliado, 0), 'comprador', coalesce(c.comprador, 0),
               'total', coalesce(c.total, 0)) order by d.dia)
      from generate_series((p_inicio at time zone 'America/Sao_Paulo')::date,
                           ((p_fim - interval '1 second') at time zone 'America/Sao_Paulo')::date, interval '1 day') as d(dia)
      left join (
        select (criado_em at time zone 'America/Sao_Paulo')::date as dia,
               count(*) filter (where interesse = 'loja') as loja,
               count(*) filter (where interesse = 'vendedor') as vendedor,
               count(*) filter (where interesse = 'afiliado') as afiliado,
               count(*) filter (where interesse = 'comprador') as comprador,
               count(*) as total
        from public.waitlist where criado_em >= p_inicio and criado_em < p_fim group by 1
      ) c on c.dia = d.dia::date), '[]'),
    -- quem mais indicou (código ?ref=), só indicações válidas (outro IP)
    'top_indicadores', coalesce((
      select jsonb_agg(jsonb_build_object('nome', nome, 'codigo', codigo_indicacao, 'perfil', interesse, 'indicacoes', indicacoes)
                       order by indicacoes desc, criado_em)
      from (select nome, codigo_indicacao, interesse, indicacoes, criado_em
            from public.waitlist_com_indicacoes where indicacoes > 0
            order by indicacoes desc, criado_em limit 10) t), '[]')
  );
end;
$$;
revoke execute on function public.admin_lista_espera_resumo(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_lista_espera_resumo(timestamptz, timestamptz) to authenticated;
