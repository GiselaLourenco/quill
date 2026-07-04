# PRD — Quill

**Documento de Requisitos de Produto · v1**
Aplicativo de acompanhamento, gamificação e comunidade de leitura, com compartilhamento
no Instagram Stories e expansão futura para jogos.

---

## 1. Visão geral

**Quill** é um app pessoal (para o autor e um pequeno grupo de amigos) que transforma o
hábito de leitura em algo **acompanhável, gamificado e social**. O usuário organiza os
livros numa estante virtual, registra suas leituras (tempo, páginas, trechos favoritos),
acompanha estatísticas e sequências no estilo Kindle/Forest, lê em grupo com amigos,
conversa sobre os livros numa camada de comunidade inspirada no TV Time e no Wattpad, e
compartilha marcos no Instagram Stories.

O objetivo emocional é **manter a constância e o prazer da leitura**, não pressionar. A
gamificação é centrada na jornada individual; qualquer elemento competitivo é opcional.

## 2. Objetivos e não-objetivos

**Objetivos**
- Registrar leituras de forma simples: livro, progresso, tempo, trechos.
- Dar insights e gamificação leves e **configuráveis** pelo próprio usuário.
- Permitir leitura coletiva (grupos com cronograma) e discussão sem spoilers.
- Compartilhar marcos no Instagram Stories com arte própria.
- Ser mobile-first, simples e intuitivo, com estética dos anos 90.
- Rodar em plataformas de baixo/zero custo (uso pessoal + amigos).

**Não-objetivos (v1)**
- Personalização da "biblioteca" (temas, skins).
- Recomendações automáticas por IA/n8n — planejado para o futuro.
- Integração com plataformas externas (Kindle, Steam etc.) — exploração futura.
- Monetização, escala pública, moderação avançada.

## 3. Público-alvo
- **Primário:** o autor do projeto.
- **Secundário:** um grupo pequeno de amigos leitores.
- Perfil: gostam de ler, querem constância, curtem trocar impressões e um empurrãozinho
  lúdico. Sensíveis à experiência de uso (simplicidade importa mais que abundância de recursos).

## 4. Conceitos centrais (modelo mental)
- **Item de mídia:** a unidade acompanhável. Em v1 é sempre um *livro*; a arquitetura já
  prevê *jogo* no futuro (ver seção 11).
- **Estante:** a coleção de itens do usuário, exibida como grade de capas.
- **Check-in / sessão:** o registro de uma leitura. Unifica quanto se leu (tempo/páginas)
  e, opcionalmente, a foto de um trecho que a pessoa gostou.
- **Comunidade:** comentários, notas e reações sobre livro/capítulo/trecho, com trava
  anti-spoiler.
- **Leitura coletiva:** grupos que leem juntos, em dois formatos — *desafio* (com prazo)
  e *clube* (contínuo).

## 5. Requisitos funcionais

### 5.1 Biblioteca / Estante
- Botão **"Add"** sempre acessível.
- Ao adicionar: capa (upload de imagem) + título; opcionais: autor, total de páginas,
  status, **link de playlist do Spotify**.
- Grade de capas, rolagem vertical, mobile-first.
- Status do item: `quero_ler` · `lendo` · `terminei` · `abandonei`.

### 5.2 Página do livro
- **Tempo de leitura** (derivado do início/fim e da soma das sessões).
- **Status** (terminado / abandonado / em andamento).
- **Progresso por dia:** dias lidos e páginas por dia.
- **Highlights:** fotos de trechos favoritos, com página e nota opcional.
- **Comentários** (ver 5.6), incluindo discussão por capítulo.
- **Player de Spotify** embutido (iframe da playlist).

### 5.3 Sessão de leitura (estilo Forest)
- **Play** inicia timer; **stop** encerra.
- Modal ao encerrar: páginas lidas + tags de qualidade (*li sem distrações*, *parei para
  olhar o celular*, *a leitura fluiu*, *foi difícil*).
- Grava: item, data, duração, páginas, tags. Alimenta streaks, calendário e insights.

### 5.4 Gamificação & Insights
- **Métricas configuráveis ("pílulas"):** catálogo de métricas; o usuário escolhe quais
  aparecem no painel (sequência de dias, páginas/dia, minutos, livros terminados, taxa de
  foco, capítulos/semana, melhor horário de leitura). A escolha é filtro de exibição.
- **Calendário / heatmap** de dias lidos.
- **Sequências:** dias consecutivos, recorde, semanas consecutivas.
- **Metas:** livros/ano, páginas/dia, minutos/dia etc., com progresso.
- **Retrospectiva mensal/anual** (estilo "wrapped").
- (Fase 2) **Badges/conquistas.**
- **Bem-estar:** foco na própria jornada; nada de comparação forçada.

### 5.5 Leitura coletiva
- Criar **grupo**: **desafio** (com prazo, mais competitivo) ou **clube** (contínuo, foco
  em constância).
- **Cronograma configurável:** capítulos/páginas por dia/semana/mês.
- **Placar opt-in:** o grupo define a métrica de pontuação (páginas, dias ativos, check-ins,
  capítulos, minutos); cada membro escolhe se quer **aparecer no ranking**.
- **Progresso coletivo** (barra) e **chat** do grupo.
- **Indicar um livro a um amigo.**

### 5.6 Comunidade & social
- **Comentários em três níveis:** livro · capítulo · passagem (trecho/foto).
- **Trava anti-spoiler:** comentários de um capítulo só aparecem para quem já leu até ali.
- **Notas / avaliação:** estrelas por livro (separado das reações).
- **Reações com GIF** (API do Tenor/Giphy), emojis e fotos.
- **Público/privado** por comentário.
- **Feed** de atividades de quem você segue; **amizades/seguir**.

### 5.7 Compartilhar no Instagram Stories
- **Sistema de um template só:** mesmo quadro 90s (cabeçalho, formas, rodapé); só o miolo muda.
- Cards (prioridade): **livro terminado**, **trecho favorito**, **retrospectiva**,
  **sequência**, **meta batida**. Secundários: "comecei a ler" e conquista/badge.
- Técnico: renderizar o card num nó oculto 1080×1920 → PNG com `html-to-image` →
  `navigator.share({ files: [png] })`. Desktop → fallback de download. **Sem tabela nova.**

### 5.8 Descoberta
- **Recomendações por gosto** (v1 manual/simples; futuro n8n ou Edge Function com
  Open Library/Google Books).
- **O que amigos compartilharam** sobre os livros que você está lendo.

## 6. Modelo de dados (generalizado para mídia)

> Decisão-chave: modelar um conceito genérico de **item de mídia** já em v1, para que
> *jogos* entrem no futuro sem migração pesada. Em v1, todo item tem `type = 'book'`.
> Detalhe completo (tipos, relações, RLS) em `supabase/schema.sql`.

- **profiles** — perfil (username, display_name, avatar_url, metrics_prefs).
- **media_items** — item (type book/game, title, creator, cover_url, total_units, status,
  spotify_url, datas).
- **sessions** — leitura/jogatina (duração, unit_start/end, quality_tags).
- **highlights** — fotos de trechos (image_url, unit_ref, note, is_public).
- **comments** — comentários (scope item/chapter/passage, chapter_ref, passage_ref,
  gif_url, is_public).
- **ratings** — nota por item (1 por usuário).
- **goals** — metas.
- **groups** / **group_members** / **group_schedule** — leitura coletiva (format, scoring_metric,
  competes, cronograma).
- **friendships** — amizades.
- **recommendations** — indicações (source friend/system).

**Storage:** buckets `covers`, `highlights`, `avatars`. **RLS por tabela** — habilitada em
todas; público conforme flag + trava de spoiler na aplicação; dados de grupo só para membros.

## 7. Arquitetura técnica
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind. Mobile-first.
- **Backend/dados:** Supabase (Auth, Postgres, Storage, RLS).
- **GIFs:** Tenor/Giphy. **Spotify:** iframe embed. **Compartilhar:** html-to-image + Web Share API.
- **Hospedagem:** Vercel (free). **Construção:** Claude Code; **design** no Claude Design.
- **Recomendações (futuro):** n8n self-hosted ou Supabase Edge Function.
- **Free tier Supabase:** projeto pausa após ~7 dias sem requisições → keepalive agendado.

## 8. Requisitos não-funcionais
- **UX:** simples e intuitivo acima de tudo; telas limpas.
- **Mobile-first:** melhor experiência no celular; responsivo.
- **Design — estética anos 90 (cozy / Memphis-lite):** base papel/creme; acentos coral,
  verde-musgo e mostarda, detalhe navy; tipografia chunky nos destaques + serifada quente
  nos títulos; formas Memphis achatadas; "sombra dura" (bloco deslocado, sem blur).
  Noventinha mas legível e não poluído. Sem personalização de biblioteca em v1.
- **Privacidade:** RLS rigoroso; separar público de privado.
- **Custo:** priorizar plataformas gratuitas.

## 9. Roadmap por fases
1. **Base:** auth + profiles + Supabase conectado.
2. **Estante:** add livro (capa, título, Spotify), grid, status.
3. **Página do livro:** sessões, tempo, páginas/dia, highlights, comentários.
4. **Gamificação:** calendário, sequências, metas, pílulas, timer Forest, retrospectiva.
5. **Social:** comentários por nível + trava de spoiler, notas, GIFs, feed, indicar livro.
6. **Compartilhar cards** no Instagram Stories.
7. **Leitura coletiva:** desafio/clube, cronograma, placar opt-in, chat.
8. **Descoberta + (futuro) n8n.**
9. **Fase 2:** badges, insights analíticos.

## 10. Expansão futura: Jogos
Mesma proposta aplicada a jogos (`type='game'`): add jogos; status `quero_jogar`/`jogando`/
`zerei`/`abandonei`/`platinei`; "highlights" viram **tutoriais/dicas de fase** e prints;
notas e comentários (mesma comunidade); compartilhar; tempo para zerar.
**Tempo de jogo:** Steam Web API expõe playtime (viável); consoles são fechados
(via terceiros); Nintendo praticamente manual; fallback universal = registro manual.
Como as tabelas já são genéricas, a maior parte do trabalho é de UI e rotulagem.

## 11. Exploração futura: Integrações de dados
- **Kindle:** sem API oficial de progresso; caminho = importar *destaques* (exportação de notas).
- **Goodreads:** API pública praticamente fechada; avaliar CSV.
- **StoryGraph:** avaliar import/export por CSV.
- **Steam:** Web API aberta — melhor candidato para jogos.
- Toda integração = importação **opcional** que popula as tabelas existentes; verificar o
  estado atual de cada API no momento da implementação.

## 12. Riscos e questões em aberto
- Limites de free tier (Supabase pause) — mitigar com keepalive.
- RLS/segurança exige atenção explícita por tabela.
- Complexidade da trava anti-spoiler (validar na camada de query).
- Trechos públicos exigirão ajuste no storage (bucket público ou signed URLs) na fase social.
- Manter v1 enxuto para preservar a simplicidade da UX.

## 13. Métricas de sucesso (projeto pessoal)
- O autor usa de forma consistente (sequência ativa).
- Amigos convidados voltam e registram leituras.
- Sessões de leitura iniciadas por semana.
- Participação em ao menos uma leitura coletiva ativa.
- Sensação subjetiva: o app deixou a leitura mais gostosa, não mais pesada.
