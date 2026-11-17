# Staypse

Plataforma brasileira de afiliados para produtos físicos e digitais.
Produtores cadastram produtos e definem a comissão; revendedores indicam pela
própria vitrine (`staypse.com.br/nome`); no pagamento, a Lytex faz o split
automático entre produtor, revendedor e Staypse.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 · Supabase
(São Paulo) · Lytex (pagamentos, a partir da Etapa 6) · Vercel.

---

## Estrutura

```
src/
  config/empresa.ts       ← dados do rodapé (nome, CNPJ, endereço, contatos) e versão dos termos
  proxy.ts                ← renova a sessão e protege /painel e /admin
  lib/papeis.ts           ← quem está logado, papéis e para onde cada um vai
  lib/supabase/           ← conexão com o Supabase
  components/             ← Logo, Cabeçalho, Rodapé, peças de formulário
  app/
    page.tsx              ← página inicial (provisória)
    entrar/  cadastro/    ← login (senha ou link mágico) e cadastro
    auth/confirmar/       ← destino dos links enviados por e-mail
    sair/                 ← logout (POST)
    painel/               ← /painel (distribui), /painel/produtor, /painel/revendedor
    admin/                ← painel do admin
    termos/ privacidade/  ← textos legais (provisórios) + canal LGPD
supabase/
  migrations/             ← banco: tabelas, RLS, permissões, buckets
  tests/                  ← testes das regras do banco
  config.toml             ← Supabase local (desenvolvimento)
public/brand/             ← SVGs OFICIAIS da logo (nunca redesenhar)
legado/                   ← site antigo, só para consulta
```

## Regras de conformidade e onde estão no código

| Regra | Onde |
|---|---|
| 1. Staypse nunca guarda dinheiro | `payment_refs` só guarda referências (id da cobrança, status, % do split). Nenhuma coluna de saldo/carteira/repasse — há teste que garante isso. |
| 2. Produtor com CNPJ ativo + documento; nota fiscal por venda | Constraint `producers_aprovacao_exige_cnpj_e_documento`; `order_items_entrega_exige_nota` impede marcar envio sem NF. |
| 3. Rodapé legal | `src/components/Rodape.tsx` lendo `src/config/empresa.ts`, presente no layout raiz. |
| 4. Resumo antes de pagar | `orders.resumo_aceito_em` obrigatório (tela vem na etapa de checkout). |
| 5. Arrependimento de 7 dias | `orders.arrependimento_ate` (lógica vem na etapa de pedidos). |
| 6. Revendedor ganha só sobre as próprias vendas | Comissão só via `orders.revendedor_id`; não existe tabela de indicação nem taxa de adesão. |
| 7. Aceite com data e versão; canal LGPD | `terms_acceptances` (imutável, data do servidor); `/privacidade#canal-lgpd`. |

---

## Rodar no seu computador

Requisitos: Node 20+ e Docker (para o Supabase local).

```bash
npm install
npx supabase start          # sobe Supabase local e aplica as migrações
cp .env.example .env.local  # preencha com a URL e a "Publishable key" que o comando acima mostrou
npm run dev                 # abre em http://localhost:3000
```

E-mails de teste (confirmação e link mágico) chegam em http://127.0.0.1:54324.

### Testes

```bash
npm run test:db               # testes das regras do banco (RLS, permissões, conformidade)
npm run build                  # checa tipos e compila
```

---

## Subir no Supabase de verdade (projeto "staypse", São Paulo)

1. **Criar o projeto:** supabase.com → New project → nome `staypse`,
   região **South America (São Paulo)**. Guarde a senha do banco.
2. **Criar o banco:** SQL Editor → cole e rode, **nesta ordem**, cada arquivo de
   `supabase/migrations/`:
   1. `20261116000001_fundacao.sql`
   2. `20261117000001_lista_espera.sql`
   3. `20261118000001_area_produtor.sql`
   4. `20261119000001_endurece_funcoes.sql`

   (ou, de uma vez: `npx supabase link --project-ref SEU_ID && npx supabase db push`)
3. **Autenticação** (Authentication → URL Configuration):
   - Site URL: `https://staypse.com.br` (enquanto não tiver domínio, a URL da Vercel)
   - Redirect URLs: `https://staypse.com.br/**`, `http://localhost:3000/**`
   - Em Authentication → Providers → Email: deixe **Confirm email** ligado e
     senha mínima de **8** caracteres.
4. **Variáveis:** Project Settings → API → copie a URL, a *Publishable key* e a
   *Secret key* para o `.env.local` (e depois para a Vercel). Sem domínio
   próprio, não defina `NEXT_PUBLIC_SITE_URL`: o site usa o endereço da Vercel.
   `HASH_IP_SEGREDO` é opcional. Veja `.env.example`.
5. **Tornar-se admin:** crie sua conta pelo site e rode no SQL Editor:
   ```sql
   insert into public.user_roles (user_id, papel)
   select id, 'admin' from auth.users where email = 'SEU-EMAIL';
   ```
6. **(Recomendado) E-mails em português:** Authentication → Email Templates.
   Para o link funcionar mesmo se aberto em outro navegador/celular, use no
   botão dos templates *Confirm signup* e *Magic Link*:
   `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email&proximo=/painel`

---

## ⚠️ Obrigatório antes de abrir o beta ao público

- [ ] **E-mail próprio (SMTP) no Supabase** — Authentication → SMTP Settings.
      O envio padrão do Supabase tem limite muito baixo por hora: sem SMTP
      próprio, confirmações de cadastro e links mágicos deixam de chegar.
      Configure também os textos dos e-mails em português (passo 6 acima).
- [ ] Dados reais em `src/config/empresa.ts` (rodapé legal).
- [ ] Contrato do Produtor (`/contrato-produtor`) revisado por advogado; ao mudar o texto,
      trocar `CONTRATO_PRODUTOR_VERSAO` em `src/config/empresa.ts`.
- [ ] SVGs oficiais em `public/brand/`.
- [ ] Termos de Uso e Política de Privacidade revisados por advogado.

---

## Skills do projeto (Claude Code)

- **first-customer-finder** (`.claude/skills/first-customer-finder/`, licença MIT,
  de github.com/carolinacherry/claude-first-customer-finder-skill): pesquisa
  possíveis primeiros clientes a partir de sinais públicos, verifica cada fonte,
  dá nota e **só rascunha** mensagens — nunca envia nada. Use com o resumo
  `docs/brief-staypse.md`. Os relatórios vão para `outputs/` (fora do git).
  Precisa de acesso amplo à internet para pesquisar: rode no seu Claude Code
  local ou num ambiente da nuvem com rede liberada.

---

## Análise de segurança do Supabase

O analisador do Supabase (Advisors → Security) mostra avisos do tipo
"security definer function executable". Eles são **esperados** para as funções
listadas em `supabase/migrations/20261119000001_endurece_funcoes.sql` (as regras
de acesso dependem delas) e para `rls_auto_enable` (criada pelo próprio
Supabase). Qualquer aviso fora dessa lista deve ser investigado.

---

## Melhorias previstas para o beta

- **Recuperar o link de indicação por e-mail** (para quem perdeu a página de
  obrigado). Só depois do SMTP próprio configurado.
- Consulta automática do CNPJ (situação na Receita) no cadastro do produtor —
  hoje o admin confere manualmente pelo link oficial da Receita.
- Preenchimento do endereço pelo CEP.

---

## Área do produtor (Etapa 3)

- Cadastro em 5 passos (`/painel/produtor/cadastro`): empresa (CNPJ alfanumérico
  aceito), endereço de envio, documentos em bucket **privado**, aceite do
  Contrato do Produtor (versão + data do servidor) e envio para análise.
- Status do produtor: rascunho → em análise → aprovado / recusado (motivo visível).
- Itens físicos e digitais, 1 a 6 fotos comprimidas no celular, comissão de
  10% a 70%, declaração "emito nota fiscal de todas as vendas" registrada.
  Mudar preço, comissão ou descrição de item aprovado → volta para análise.
- Alerta de palavras proibidas: marca o item para revisão (não bloqueia). Os
  termos ficam na tabela `palavras_proibidas` (editar pelo SQL Editor).
- Admin: `/admin/produtores` e `/admin/itens`, com documentos (links
  temporários), aprovação/recusa com motivo e histórico (`audit_log`).
  O id do recebedor na Lytex é preenchido manualmente pelo admin nesta fase.

---

## Lista de espera (Etapa 2)

- Página inicial `staypse.com.br` com formulários de revendedor e produtor.
- Cada inscrito recebe `staypse.com.br/?ref=CODIGO` e acompanha a posição em
  `/lista/CODIGO`. Quem indica mais entra primeiro no acesso antecipado
  (sem sorteio e sem prêmio em dinheiro). Só contam indicações vindas de
  outra conexão (evita autoindicação).
- Anti-spam: honeypot + máximo de 5 inscrições por IP por hora.
- Admin em `/admin/lista`: filtros, contadores, status do contato com
  produtores e exportação CSV (abre direto no Excel).
