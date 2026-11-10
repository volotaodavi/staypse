# Pontos a definir antes de publicar

Na página, os textos pendentes aparecem destacados em amarelo (`<mark class="a-definir">`). No código, procure por `[A DEFINIR]`.

## 1. Textos da página (`index.html`)
| Onde | O que falta |
|---|---|
| Perguntas frequentes → "Quando lança?" | **[DATA A DEFINIR]** |
| Perguntas frequentes → "Quem pode ser afiliado?" | **[A DEFINIR]**: resposta inteira |
| Perguntas frequentes → "Como eu recebo?" | **[CONFIRMAR]** que o pagamento é por Pix, direto na conta |
| Rodapé → @staypse | Confirmar que o perfil `instagram.com/staypse` existe |

## 2. Política de privacidade (`privacidade.html`)
- **[DATA]** da última atualização
- **[RAZÃO SOCIAL]** e **[NÚMERO]** do CNPJ da empresa responsável
- **[E-MAIL]** de contato para privacidade (aparece 2 vezes)
- Recomendado: revisão de um advogado antes de publicar

## 3. Promessas que a página faz (confirmar que a operação consegue cumprir)
- **Votação dos produtos pelo WhatsApp antes do lançamento** (seções 6 e 8 e mensagem de sucesso do afiliado). Precisa de um processo: quem envia, quando e como os votos são contados.
- **"Todo produto passa por nós"** e **"ficha completa"** (seções 3 e 4). Precisa de um critério de curadoria por escrito.
- **"Nossa equipe analisa seu produto e fala com você"** (fornecedor). Quem responde e em quanto tempo.
- **"Vamos te chamar se a entrega local chegar na sua região"** (entregador).

## 4. Técnico
- **Supabase:** criar o projeto, rodar `supabase/schema.sql` e preencher `js/config.js` (ver `docs/supabase-setup.md`).
- **Hospedagem e domínio:** onde a página vai ficar no ar.

## 5. Etapa de design
- Identidade visual (cores, fontes, layout)
- Imagem de compartilhamento (`og:image`), domínio (`og:url`) e ícone da aba

## Decisões que tomei na estrutura (mude se preferir)
- **Cidade e estado** em dois campos (cidade digitada, estado numa lista). Facilita filtrar por região. No entregador, também pedi o estado, além de cidade e bairro.
- **Nome completo** exige nome e sobrenome. No entregador, só o nome.
- **WhatsApp** aceita celular (11 dígitos) e fixo (10 dígitos), porque lojas às vezes usam número fixo no WhatsApp Business.
- **CNPJ** aceita o formato numérico e o novo formato com letras da Receita Federal.
- **Cadastro repetido** (mesmo e-mail de afiliado, mesmo CNPJ ou mesmo WhatsApp de entregador) mostra a mensagem de sucesso normal e não grava de novo.
- **Campo invisível anti-robô** em todos os formulários.
