-- =========================================================================
-- STAYPSE — Endurecimento: quem pode executar cada função
-- =========================================================================
-- Resposta ao analisador de segurança do Supabase. O Supabase deixa toda
-- função nova executável por visitantes (anon) e usuários logados. Aqui
-- tiramos o que não precisa estar aberto. Nenhum dado é alterado.
--
-- Continuam abertas de propósito:
--  * anon: posicao_na_lista (página de obrigado), produtor_aprovado e
--    vitrine_publicada (usadas nas regras do que é público).
--  * authenticated: as funções de decisão do admin (conferem is_admin por
--    dentro), enviar_produtor_para_analise, minhas_vendas e as auxiliares das
--    regras de acesso.
-- =========================================================================

-- Auxiliares das regras de acesso: só fazem sentido para quem está logado
-- (para visitantes sempre devolveriam "falso").
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.tem_papel(text) from public, anon;
revoke execute on function public.eh_dono_produtor(uuid) from public, anon;
revoke execute on function public.eh_dono_vitrine(uuid) from public, anon;
revoke execute on function public.pode_ver_pedido(uuid) from public, anon;
revoke execute on function public.produtor_do_pedido_pago(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.tem_papel(text) to authenticated;
grant execute on function public.eh_dono_produtor(uuid) to authenticated;
grant execute on function public.eh_dono_vitrine(uuid) to authenticated;
grant execute on function public.pode_ver_pedido(uuid) to authenticated;
grant execute on function public.produtor_do_pedido_pago(uuid) to authenticated;

-- Lista de palavras proibidas: o visitante não pode "testar" textos para
-- descobrir a lista. Usuário logado precisa (o gatilho do item roda como ele).
revoke execute on function public.palavras_proibidas_em(text) from public, anon;
grant execute on function public.palavras_proibidas_em(text) to authenticated, service_role;

-- Função interna do cadastro: só o gatilho do Auth a usa (gatilhos não
-- precisam de permissão de execução de quem dispara).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
