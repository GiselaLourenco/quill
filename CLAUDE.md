# Quill — Contexto do projeto (para o Claude Code)

## O que é
**Quill** é um app **mobile-first** de leitura: estante de livros, sessões de leitura
(estilo Forest), gamificação/insights, leitura coletiva e comunidade (estilo TV Time /
Wattpad), com compartilhamento no Instagram Stories.
A spec completa está em `docs/PRD-Quill.md` — **consulte o PRD antes de qualquer
decisão de escopo**. Este arquivo é só o guia de execução.

## Stack
- **Next.js (App Router) + TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth, Postgres, Storage, RLS) via `@supabase/supabase-js` + `@supabase/ssr`
- Deploy: **Vercel** (free tier)
- GIFs: API do **Tenor** (ou Giphy) para o seletor de reações
- Spotify: **embed via iframe** (playlist pública, sem auth)
- Compartilhar cards: `html-to-image` (gerar PNG) + **Web Share API**

## Princípios inegociáveis
- **Mobile-first sempre.** Desenhar/testar no viewport ~390px antes do desktop.
- **Simplicidade de UX acima de tudo.** Telas limpas; menos é mais.
- **Nunca** expor a `service_role` key no cliente — só a `anon` key no front.
- **Toda query respeita RLS.** Nunca desabilitar RLS para "resolver" um bug; ajustar a policy.
- Config do Supabase: Data API ON + expose new tables ON + **automatic RLS ON**.

## Design — estética anos 90 (cozy / Memphis-lite)
- Base **papel/creme** (~#F5ECD7). Acentos: **coral/tomate (#D85A30), verde-musgo
  (#1D9E75 / #0F6E56), mostarda (#EF9F27)**, detalhe navy (#26215C). Texto ink (#2C2C2A).
- Tipografia: display chunky nos destaques (ex.: Archivo Black) + serifada quente
  nos títulos (ex.: Fraunces); sans limpa no corpo.
- Formas **Memphis achatadas** como acento: quarto-de-círculo, bolinhas, zigue-zague.
  Tudo flat; sem gradiente. "Sombra dura" = bloco sólido deslocado (não blur).
- Noventinha mas **legível e não poluído** — usar os acentos com parcimônia.
- Estante = grade de capas; motivo de prateleira sutil. Sem personalização de biblioteca em v1.

## Modelo de dados
- Definido em `supabase/schema.sql` — aplicar no SQL editor do Supabase.
- Conceito genérico **`media_items`** (`type` = `book` | `game`) para os jogos
  entrarem no futuro sem migração.
- **Trava anti-spoiler:** um comentário de capítulo só aparece se o progresso do leitor
  (maior `unit_end` nas `sessions` daquele item) for >= o `chapter_ref` do comentário.
  Implementar na camada de query/app, não só no RLS.

## Compartilhar no Instagram Stories
- **Sistema de um template só:** o mesmo quadro 90s (cabeçalho, formas, rodapé),
  só o miolo muda. NÃO precisa de tabela nova — o card é montado a partir de dados existentes.
- Cards (prioridade): 1) livro terminado (capa, nota, tempo, páginas) · 2) trecho favorito
  (highlight) · 3) retrospectiva (mensal/anual) · 4) sequência (streak) · 5) meta batida.
  Secundários: "comecei a ler" e conquista/badge.
- Fluxo: renderizar o card num nó oculto **1080×1920**, gerar PNG com `html-to-image`,
  e chamar `navigator.share({ files: [png] })`. Desktop → fallback de download.

## Ordem de construção (NÃO fazer tudo de uma vez)
1. Auth + `profiles` + client do Supabase + layout base.
2. **Estante:** add livro (capa, título, Spotify), grid, status.
3. **Página do livro:** sessões, tempo, páginas/dia, highlights, comentários.
4. **Gamificação:** calendário, sequências, metas, pílulas selecionáveis, timer Forest,
   retrospectiva mensal.
5. **Social:** comentários por nível + trava de spoiler, notas, GIFs, feed, indicar livro.
6. **Compartilhar cards** (Stories) — reaproveita dados das fases anteriores.
7. **Leitura coletiva:** desafio/clube, cronograma, placar opt-in, chat.
8. **Descoberta** + (futuro) n8n.

Construir e **testar uma fase antes de ir para a próxima**. Commit por fase.

## Notas de free tier
- Supabase free **pausa após ~7 dias sem requisições** — configurar keepalive agendado.
- Comprimir imagens no cliente antes do upload (capas e highlights).

## Futuro (não implementar agora — só não bloquear na arquitetura)
- **Jogos** (`type='game'`): status jogando/zerei/platinei; tutoriais de fase; tempo de jogo.
  Steam Web API expõe playtime; consoles são fechados; fallback manual.
- **Integrações:** importar destaques do Kindle; CSV do StoryGraph; Steam para jogos.
