# SEO e marketing da Staypse

Regras: sem promessa de ganho, sem número ou depoimento inventado. Tudo marcado (est.) é estimativa de ordem de grandeza, não medição: confirme no Search Console e no Planejador de Palavras-chave do Google antes de decidir investimento. Nenhuma ferramenta garante o topo do Google; o que se controla é técnica, conteúdo e autoridade, e o resultado leva meses.

## 1. O que já está no código
- Título (até 60) e descrição (até 155) únicos por página, canonical, Open Graph e Twitter, `lang="pt-BR"`.
- JSON-LD: Organization (com Instagram em `sameAs`) e WebSite na raiz; FAQPage na landing; Product + Offer + BreadcrumbList nos produtos; Store nas lojas. Sem `aggregateRating`: não há avaliações. Produto aparece como "pré-venda" enquanto o checkout está fechado e como "em estoque" quando abre. FAQ não gera mais destaque no Google (est. recurso aposentado em 2026), mas ajuda buscadores de IA.
- `sitemap.xml` com lojas aprovadas, produtos publicados e vitrines ativas (usa a função `mapa_do_site`, migração `20261220000001`: aplicar no banco). `robots.txt` bloqueia painel, admin, API, pedido, convites e links `/ir/`. Painéis têm noindex; checkout e pedido também.
- Dono: definir `NEXT_PUBLIC_SITE_URL` com o domínio final (sitemap, canonical e JSON-LD dependem dele).

## 2. Palavras-chave (volume mensal no Brasil: est., a validar)
| Termo | Volume (est.) | Intenção | Página alvo |
|---|---|---|---|
| plataforma de afiliados | médio | comparar plataformas | landing |
| programa de afiliados para lojas | baixo a médio | lojista quer abrir programa | landing + guia |
| como vender com afiliados | médio | aprender | guia no blog |
| loja online com afiliados | baixo | lojista | landing |
| split de pagamento | médio | técnico/lojista | guia no blog |
| marketplace de afiliados | baixo a médio | afiliado procura produtos | landing |
| afiliados de produtos físicos | baixo | afiliado iniciante | guia no blog |
| como ser afiliado sem estoque | médio | afiliado iniciante | guia no blog |
Termos de marca concorrente (hotmart, kiwify) têm volume alto, mas a intenção é de quem já usa; atacar com páginas de comparação honestas, não com a palavra solta.

## 3. Concorrentes e brechas
| Concorrente | Forte em | Fraco / brecha para a Staypse |
|---|---|---|
| Hotmart | marca, produtos digitais, comunidade de afiliados | foco em digital; produto físico e loja local são secundários |
| Kiwify | checkout simples, infoprodutos | idem, pouco para loja com estoque e frete |
| Nuvemshop | loja virtual completa, SEO de loja | afiliados e split exigem apps de terceiros |
| Shopee Afiliados | tráfego enorme, físico | comissão definida pela Shopee; a loja não controla marca, preço ou relacionamento |

Brechas: (1) lojas físicas e fábricas com CNPJ vendendo online; (2) afiliado de produto físico com link e vitrine próprios; (3) vendedor da própria loja com link e comissão registrada; (4) split automático já na compra, sem planilha. Comunicar isso em linguagem simples, sem atacar ninguém.

## 4. Plano de conteúdo, 90 dias (blog ou guias em `/guias`, a criar)
Cada guia: resposta direta nos primeiros 60 palavras, tópicos com H2 em formato de pergunta, tabela quando comparar, data de atualização e autor. Escrever para pessoas; nada de texto gerado em massa.
- Dias 1 a 30 (base): "O que é um programa de afiliados e como funciona numa loja"; "Split de pagamento: o que é e como a divisão acontece"; "Como ser afiliado de produto físico sem ter estoque"; "Comissão de afiliado: como definir o percentual da sua loja".
- Dias 31 a 60 (decisão): "Staypse x Hotmart x Kiwify: quando cada uma faz sentido"; "Nuvemshop com afiliados: o que muda usando a Staypse"; "Checklist para abrir um programa de afiliados na sua loja"; "Nota fiscal e afiliados: quem emite o quê".
- Dias 61 a 90 (autoridade): "Como divulgar produtos como afiliado no Instagram e WhatsApp com transparência (publicidade identificada)"; "Direito de arrependimento de 7 dias: guia para lojistas"; "Vendedor de loja com link próprio: como registrar comissão"; "Glossário do afiliado" (uma página, 30 termos).
Meta: 12 publicações, cada uma ligada à landing e a `/cadastro`. Atualizar a cada 6 meses.

## 5. SEO local
Lojas já têm página própria com cidade e UF. Passos: pedir à loja cidade, bairro e telefone completos no cadastro; criar páginas de guia "vender em [cidade]" só quando houver loja real naquela cidade (nunca páginas vazias por cidade). Cada loja deve ter também o Perfil da Empresa no Google (item 8).

## 6. Link building ético
Só links merecidos: diretórios de startups e de meios de pagamento; entrevistas e artigos convidados em blogs de e-commerce e MEI; parcerias com contadores, agências e comunidades de lojistas (link na assinatura, não compra de links); dados próprios publicados (ex.: pesquisa com lojistas, quando existir); Instagram oficial e perfis de redes ligados ao site. Evitar: compra de links, redes de blogs, comentários em massa, avaliações falsas.

## 7. Google Search Console e Bing Webmaster (passo a passo para o dono)
1. Acesse search.google.com/search-console com a conta da empresa e escolha "Propriedade de domínio".
2. Digite o domínio (ex.: staypse.com.br). O Google mostra um registro TXT.
3. No provedor do domínio (Registro.br ou onde foi comprado), crie o registro TXT em DNS com o valor mostrado. Aguarde alguns minutos e clique em Verificar.
4. Em Sitemaps, envie `https://SEU-DOMINIO/sitemap.xml`.
5. Em Inspeção de URL, cole a home e clique em "Solicitar indexação". Repita para `/cadastro` e as primeiras lojas.
6. Bing: acesse bing.com/webmasters, entre e use "Importar do Google Search Console" (verifica sozinho). Envie o mesmo sitemap. O Bing alimenta o Copilot e parte das respostas do ChatGPT.
7. Rotina: toda semana, ver Desempenho (consultas, páginas, posição média) e Páginas (indexadas x excluídas). Anotar no controle de metas (item 11).

## 8. Google Business Profile
Criar o perfil da Staypse como empresa de serviço (área de atuação: Brasil) com site, categoria "Serviço de marketing de afiliados" ou equivalente, descrição fiel e Instagram. Verificação por vídeo ou código, conforme o Google pedir. Só use avaliações reais de clientes reais; não peça em troca de vantagem. Oriente as lojas parceiras com ponto físico a criar o perfil delas e apontar para a página da loja na Staypse.

## 9. Otimização para respostas de IA
- Manter a página "O que é a Staypse" curta e factual (definição, quem usa, taxa por venda, regra anti pirâmide) e as taxas públicas e datadas.
- Perguntas reais em H2 com resposta direta, tabelas de comparação e FAQ (já na landing).
- Garantir que os rastreadores de busca de IA não estejam bloqueados (OAI-SearchBot, PerplexityBot, Claude-SearchBot): hoje o `robots.txt` os permite.
- Estar nos índices: Bing Webmaster (ChatGPT e Copilot) e Search Console (Google). Considerar um `llms.txt` simples depois; não é requisito do Google.
- Presença externa consistente: mesmo nome, descrição e Instagram em diretórios e perfis.
- Teste mensal: 10 perguntas em ChatGPT, Perplexity e Google ("melhor plataforma de afiliados para loja física"); rodar cada uma 3 vezes e anotar se a Staypse aparece. Respostas variam, então acompanhe a taxa e não um único teste.

## 10. Marketing interno: funil
Visitante, cadastro, loja ativa (aprovada, com produto publicado), primeira venda.
- Visitante para cadastro: landing clara, prova só com dados reais, formulário curto.
- Cadastro para loja ativa: onboarding em passos (CNPJ, dados de recebimento, primeiro produto, foto e comissão); mostrar o que falta no painel.
- Loja ativa para primeira venda: convidar afiliados e vendedores, compartilhar link da loja, vitrine pronta, produto com boa foto e descrição completa.
- E-mails de ativação (enviar quando o Resend estiver ativo, com opção de sair e só para quem se cadastrou): D0 boas-vindas e próximo passo; D2 "falta o primeiro produto"; D5 "como convidar afiliados"; D10 "sua loja está pronta, compartilhe o link"; após aprovação da loja, aviso e guia; após primeira venda, parabéns e boas práticas de envio. Textos curtos, sem promessa de ganho.
- Indicação de lojas: loja indica loja por link. Nunca há comissão ou ganho por recrutamento (regra de pirâmide). Se o dono quiser, apenas benefício de taxa promocional por tempo limitado ao indicado e ao indicador, com regra escrita nos termos e validação jurídica.

## 11. Métricas e metas (preencher com a linha de base real; metas são decisão do dono)
| Métrica | Fonte | Meta inicial sugerida |
|---|---|---|
| Impressões e cliques orgânicos | Search Console | crescer mês a mês, comparar a cada 30 dias |
| Páginas indexadas / enviadas | Search Console | acima de 90% |
| Posição média das 8 palavras-chave | Search Console | evoluir; revisar a cada 30 dias |
| Visitante para cadastro | analytics | medir 30 dias e depois definir meta |
| Cadastro para loja ativa | banco | idem |
| Loja ativa para primeira venda | banco | idem; tempo até a primeira venda |
| Citação em respostas de IA | teste mensal | 10 perguntas, taxa anotada |
Medir antes de prometer: não divulgar nenhum número de resultado até existir dado real.
