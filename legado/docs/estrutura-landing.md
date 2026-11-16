# Landing page Staypse: estrutura (pronta para a etapa de design)

**Objetivo:** lista de espera.
- **Afiliados** (principal): vendem pelo Instagram, TikTok, WhatsApp ou tráfego pago.
- **Fornecedores** (secundário): fábricas e pequenas lojas.
- **Entregadores** (teste de interesse): só um link discreto no rodapé, para medir a demanda de entrega local (decisão da Fase 3).

**Ideia central:** "Indicar é emprestar seu nome."
**Tom:** direto, humano, brasileiro. Sem "liberdade", "renda extra fácil", "fique rico", números ou depoimentos inventados.

## Arquivos
| Arquivo | O que é |
|---|---|
| `index.html` | página principal: 9 seções + formulário com 2 abas |
| `entregador.html` | formulário curto do entregador (só pelo rodapé, fora do Google) |
| `privacidade.html` | política de privacidade (LGPD) |
| `css/base.css` | estrutura mínima, sem design |
| `js/formularios.js` | máscaras, validação e envio dos 3 formulários |
| `js/abas.js` | abas "Sou afiliado" / "Tenho fábrica ou loja" |
| `js/rastreamento.js` | medição de visitas e cliques |
| `js/config.js` | endereço e chave do Supabase |
| `supabase/schema.sql` | tabelas, regras de segurança e consultas prontas |

## Seções do `index.html`
| # | Seção | Botão (`data-evento`) |
|---|---|---|
| 1 | Topo: Indicar é emprestar seu nome. | Entrar na lista (`topo_entrar_lista`) · Tenho uma fábrica ou loja → (`topo_fornecedor`) |
| 2 | A dor | — |
| 3 | No que acreditamos + "Fica de fora" | — |
| 4 | Como funciona: Escolha → Indique → Receba | Entrar na lista (`como_funciona_entrar_lista`) |
| 5 | Uma venda. Duas partes. | Cadastrar minha fábrica ou loja (`duas_partes_cadastrar_fornecedor`) |
| 6 | Quem chega primeiro monta a vitrine. | Quero escolher os produtos (`agora_escolher_produtos`) |
| 7 | Perguntas frequentes | link "cadastro" (`faq_cadastrar_fornecedor`) |
| 8 | Formulário: Sua vaga. Seu voto. (abas) | Entrar na lista (`enviar_afiliado`) · Cadastrar minha fábrica ou loja (`enviar_fornecedor`) |
| 9 | Rodapé | @staypse · Política de privacidade · Quer entregar com a Staypse? (`rodape_entregador`) · © 2026 |

Botões de afiliado abrem a aba "Sou afiliado"; botões de fornecedor abrem "Tenho fábrica ou loja". Link direto para a aba de fornecedor: `index.html#fornecedor`.

## Formulários
**Afiliado:** nome completo, WhatsApp, e-mail, cidade, UF, onde vende (várias opções), já vende produto físico (sim/não), que tipo de produto gostaria de vender, aceite da política.

**Fábrica ou loja:** fábrica/loja, nome do responsável, nome da empresa, CNPJ, WhatsApp, e-mail, cidade, UF, o que vende, já trabalha com afiliados (sim/não), entrega na região (sim/não/às vezes), aceite da política.

**Entregador:** nome, WhatsApp, cidade, UF, bairro, veículo (moto/bicicleta/carro), aceite da política.

Todos: máscara de WhatsApp e CNPJ, mensagem de erro por campo, campo anti-robô e gravação de tipo, data, UTM, site de origem e código da visita.

## Medição
Tudo fica no Supabase. O guia de consulta está em `docs/supabase-setup.md`.

## Pendências
Ver `docs/a-definir.md`.
