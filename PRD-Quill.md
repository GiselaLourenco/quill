# PRD — Quill

**Documento de Requisitos de Produto · v2 (2026-07-04)**
Aplicativo de acompanhamento, gamificação e comunidade de leitura, com personagem próprio,
desafios em grupo estilo GymRats, compartilhamento no Instagram Stories e expansão futura
para jogos.

> **O que mudou da v1 → v2:** (a) o **personagem Quill** virou pilar de produto, não só
> detalhe de marca; (b) a gamificação individual foi detalhada com base no estudo do
> **Bookly** (stats avançadas, previsões, relatórios, conquistas com progressão visível);
> (c) a leitura coletiva em formato *desafio* foi redesenhada no modelo **GymRats**
> (check-in com foto, feed do desafio, ranking, calendário, código de convite);
> (d) nova seção **7 — Workflow do usuário**, com o que se vê/edita em cada etapa;
> (e) roadmap reordenado para priorizar gamificação → desafios → personagem.

---

## 1. Visão geral

**Quill** é um app pessoal (para o autor e um pequeno grupo de amigos) que transforma o
hábito de leitura em algo **acompanhável, gamificado e social**. O usuário organiza os
livros numa estante virtual, registra suas leituras (tempo, páginas, trechos favoritos),
acompanha estatísticas e sequências no estilo Kindle/Forest/Bookly, participa de
**desafios de leitura com amigos** no estilo GymRats, conversa sobre os livros numa camada
de comunidade inspirada no TV Time e no Wattpad, e compartilha marcos no Instagram Stories.

O app tem um **personagem próprio — Quill, a sementinha** — que dá cara, voz e emoção à
experiência: recebe o usuário, acompanha as sessões de leitura e cresce junto com a
constância de quem lê.

O objetivo emocional é **manter a constância e o prazer da leitura**, não pressionar. A
gamificação é centrada na jornada individual; qualquer elemento competitivo é opcional.

## 2. Objetivos e não-objetivos

**Objetivos**
- Registrar leituras de forma simples: livro, progresso, tempo, trechos.
- Dar insights e gamificação leves e **configuráveis** pelo próprio usuário.
- Fazer o usuário *sentir* progresso: stats que contam uma história (velocidade, previsão
  de término, melhor horário), conquistas com caminho visível e um personagem que evolui.
- Permitir **desafios de leitura em grupo** (estilo GymRats) e leitura coletiva contínua
  (clube), com discussão sem spoilers.
- Compartilhar marcos no Instagram Stories com arte própria.
- Ser mobile-first, simples e intuitivo, com estética dos anos 90 (versão suavizada — ver §10).
- Rodar em plataformas de baixo/zero custo (uso pessoal + amigos).

**Não-objetivos (v1)**
- Personalização da "biblioteca" (temas, skins).
- Recomendações automáticas por IA/n8n — planejado para o futuro.
- Integração com plataformas externas (Kindle, Steam etc.) — exploração futura.
- Monetização, escala pública, moderação avançada.
- Assistente de IA conversacional (o Bloo do Bookly é referência de *presença*, não de chatbot).

## 3. Público-alvo
- **Primário:** o autor do projeto.
- **Secundário:** um grupo pequeno de amigos leitores.
- Perfil: gostam de ler, querem constância, curtem trocar impressões e um empurrãozinho
  lúdico. Sensíveis à experiência de uso (simplicidade importa mais que abundância de recursos).

## 4. Conceitos centrais (modelo mental)
- **Item de mídia:** a unidade acompanhável. Em v1 é sempre um *livro*; a arquitetura já
  prevê *jogo* no futuro (ver §12).
- **Estante:** a coleção de itens do usuário, exibida como grade de capas.
- **Sessão:** o registro de uma leitura (tempo e, opcionalmente, páginas + tags de
  qualidade + vínculo com um livro). É a matéria-prima de todas as stats.
- **Check-in:** uma sessão **publicada num desafio** — o equivalente ao "treino com foto"
  do GymRats. Sessão é privada por padrão; check-in é o ato social.
- **Desafio:** grupo com data de início/fim, métrica de pontuação e ranking (GymRats).
- **Clube:** grupo contínuo, com cronograma de capítulos e foco em constância, sem placar.
- **Personagem (Quill):** a sementinha mascote; reage a eventos e cresce com a constância.
- **Comunidade:** comentários, notas e reações sobre livro/capítulo/trecho, com trava
  anti-spoiler.

## 5. Benchmarks e lições incorporadas

| Referência | O que aproveitar | O que evitar |
|---|---|---|
| **Bookly** | Stats que contam história: pág/hora, previsão de término ("nesse ritmo você termina em N dias"), melhor horário, recordes; relatórios semanais/mensais; meta anual quebrada em alvo diário; infográficos compartilháveis; mascote com presença (Bloo). | Timer que trava a navegação e pressiona; conquistas sem descrição nem progressão visível; carrossel de capas; limite escondido do plano free. |
| **GymRats** | Desafio com início/fim; entrada por código; check-in publicado num feed com reações/comentários; ranking com métrica escolhida na criação; calendário de check-ins; recap no encerramento. | Tom "academia/cobrança" e foto obrigatória como prova. No Quill a "prova" é o próprio registro de progresso (timer ou manual); foto é extra opcional; placar opt-in e tom acolhedor. |
| **Forest** | Timer como ritual de foco; algo *cresce* enquanto você se dedica. | Punição por falha (árvore morta). Quill nunca pune — no máximo sente saudade. |
| **Duolingo** | Streaks, personagem com personalidade forte e opinião. | Notificações agressivas/culpa. |

## 6. Requisitos funcionais

### 6.1 Biblioteca / Estante
- Botão **"Add"** sempre acessível.
- Ao adicionar: capa (busca Open Library ou ilustração Quill) + título; opcionais: autor,
  total de páginas, status, **link de playlist do Spotify**.
- Grade de capas (3 colunas), rolagem vertical, mobile-first.
- Status do item: `quero_ler` · `lendo` · `terminei` · `abandonei`.

### 6.2 Página do livro
- **Tempo de leitura** (derivado do início/fim e da soma das sessões).
- **Status** (terminado / abandonado / em andamento).
- **Progresso por dia:** dias lidos e páginas por dia.
- **Previsão de término** (estilo Bookly): com base no ritmo recente (pág/dia dos últimos
  N dias) e nas páginas restantes, "nesse ritmo você termina em ~X dias (dd/mm)".
- **Velocidade** no contexto do livro: pág/hora média.
- **Highlights:** fotos de trechos favoritos, com página e nota opcional.
- **Comentários** (ver 6.7), incluindo discussão por capítulo.
- **Player de Spotify** embutido (iframe da playlist).

### 6.3 Sessão de leitura (aba **Ler**)
- **Play** inicia timer **sem exigir livro** (já implementado); **pause** e **stop**.
- O timer **nunca trava o app** (lição Bookly): dá para navegar em outras abas com a
  sessão rodando; um indicador discreto mostra que há sessão ativa.
- Modal ao encerrar: páginas lidas + tags de qualidade (*li sem distrações*, *parei para
  olhar o celular*, *a leitura fluiu*, *foi difícil*) + vínculo opcional com um livro.
- **Registro manual** (sem timer): "li e esqueci de marcar" — informar duração/páginas/data
  retroativamente. Tracking é ferramenta, não obrigação.
- Se o usuário participa de um **desafio ativo**, o modal de encerramento oferece
  **"publicar como check-in"** (ver 6.6) — com foto opcional do trecho/momento.
- Durante a sessão, o **personagem Quill lê junto** (cena aconchegante, loop leve).
- Grava: item (opcional), data, duração, páginas, tags. Alimenta streaks, calendário,
  insights e desafios.

### 6.4 Gamificação individual & Insights (estilo Bookly)
- **Métricas configuráveis ("pílulas"):** catálogo de métricas; o usuário escolhe quais
  aparecem no painel. Catálogo v2: sequência de dias · páginas/dia · minutos ·
  livros terminados · taxa de foco (tags) · capítulos/semana · melhor horário de leitura ·
  **velocidade (pág/hora)** · **recorde de páginas numa sessão** · **maior sequência histórica**.
- **Calendário / heatmap** de dias lidos.
- **Sequências:** dias consecutivos, recorde, semanas consecutivas. Perder a sequência
  nunca gera punição visual agressiva — o personagem "sente sua falta", só.
- **Metas com quebra diária:** meta grande (livros/ano, páginas totais) sempre traduzida
  num alvo pequeno e alcançável ("~14 pág/dia para bater sua meta do ano"), recalculado
  conforme o ritmo real. Metas de rotina: páginas/dia, minutos/dia.
- **Relatório semanal e mensal:** resumo automático (tempo, páginas, velocidade, dias
  lidos, comparação com o período anterior) — a base da retrospectiva e dos cards.
- **Retrospectiva mensal/anual** (estilo "wrapped").
- **Conquistas (badges) com progressão visível** (lição Bookly): toda conquista bloqueada
  mostra nome, descrição e critério ("Leia 7 dias seguidos — faltam 2"); organizadas por
  nível (bronze/prata/ouro ou similar). Nada de badge misteriosa.
- **Bosque que cresce:** cada livro cultiva uma árvore (semente → árvore com frutos);
  a constância acelera o crescimento (ver §6.5, §8 e MARCA-Quill.md). É a versão Quill
  da floresta do Forest / trilha do Duolingo.
- **Bem-estar:** foco na própria jornada; nada de comparação forçada.

### 6.5 Personagem (Quill, a sementinha)
- **Presença pontual, não onipresente** (regra do MARCA-Quill.md): login/abertura, sessão
  de leitura, celebrações (meta batida, livro terminado, conquista, fim de desafio),
  retrospectiva e estados vazios.
- **Reações com opinião** (personalidade forte, humor seco): celebra dramático quando
  você bate meta; fica sonolento em sessões noturnas; lança um olhar de julgamento
  silencioso quando a tag é "parei para olhar o celular"; rouba a cena na retrospectiva.
- **Tom adulto:** carismático sem ser infantil — referências: mascote da Claude/Anthropic,
  Yoshi, Cuphead, Minions, Koroks (Zelda), Stardew Valley. Nada de tom "bebê fofo".
- **Crescimento (semente → árvore):** o personagem mantém a forma (identidade de marca);
  quem cresce é o **Bosque do leitor** — cada livro cultiva uma árvore, da semente à copa
  com frutos, e a constância acelera o crescimento. Sem "morte": inatividade só faz o
  Quill cochilar. Detalhe em MARCA-Quill.md.
- Detalhamento de design/personalidade em `MARCA-Quill.md`; produção via Rive (pesquisar).

### 6.6 Desafios de leitura (estilo GymRats)
- **Criar desafio:** nome, descrição, capa (opcional), **data de início e fim**,
  **métrica de pontuação** escolhida pelo criador: nº de check-ins · dias ativos ·
  páginas · minutos. Opcional: regra de check-in mínimo ("1 por dia conta 1 ponto, no
  máximo 1/dia") e livro único ou livre.
- **Entrar por código/link de convite** (6 caracteres) — sem busca pública.
- **Check-in:** uma sessão publicada no desafio. **O que vale é o registro do progresso
  de leitura** — feito pelo timer da aba Ler ou por registro manual no livro. Foto
  (trecho, cantinho de leitura) e comentário curto são **totalmente opcionais**, nunca
  exigidos. Vem do modal de fim de sessão ou do registro manual.
- **Feed do desafio:** check-ins dos membros em ordem cronológica; **reações** (emoji) e
  **comentários** por check-in.
- **Ranking:** placar pela métrica do desafio. **Opt-in por membro** — quem não quiser
  competir participa do feed sem aparecer no placar.
- **Calendário do desafio:** grade dias × membros mostrando quem fez check-in em cada dia.
- **Encerramento:** recap automático (vencedor, totais do grupo, recordes, destaque de
  fotos) + celebração do personagem + card compartilhável.
- **Notificações leves (futuro):** "fulano fez check-in" — nunca cobrança.

### 6.7 Clube de leitura (contínuo) & comunidade
- **Clube:** grupo contínuo, sem placar; **cronograma configurável** (capítulos/páginas
  por dia/semana/mês) e **progresso coletivo** (barra); chat/discussão.
- **Comentários em três níveis:** livro · capítulo · passagem (trecho/foto).
- **Trava anti-spoiler:** comentários de um capítulo só aparecem para quem já leu até ali.
- **Notas / avaliação:** estrelas por livro (separado das reações).
- **Reações com GIF** (API do Tenor/Giphy), emojis e fotos.
- **Público/privado** por comentário.
- **Feed** de atividades de quem você segue; **amizades/seguir**.
- **Indicar um livro a um amigo.**

### 6.8 Compartilhar no Instagram Stories
- **Sistema de um template só:** mesmo quadro 90s (cabeçalho, formas, rodapé); só o miolo muda.
- Cards (prioridade): **livro terminado**, **trecho favorito**, **retrospectiva**,
  **sequência**, **meta batida**, **recap de desafio**. Secundários: "comecei a ler",
  conquista/badge e **relatório semanal** (infográfico estilo Bookly).
- O personagem Quill assina os cards (presença de marca).
- Técnico: renderizar o card num nó oculto 1080×1920 → PNG com `html-to-image` →
  `navigator.share({ files: [png] })`. Desktop → fallback de download. **Sem tabela nova.**

### 6.9 Descoberta
- **Recomendações por gosto** (v1 manual/simples; futuro n8n ou Edge Function com
  Open Library/Google Books).
- **O que amigos compartilharam** sobre os livros que você está lendo.

## 7. Workflow do usuário (o que vê / o que edita em cada etapa)

> Navegação base (já implementada): **tab bar** com 3 abas — **Quill** (home/stats),
> **Ler** (sessão) e **Estante**. Desafios e Perfil entram como 4ª/5ª entradas quando as
> fases chegarem (avaliar tab "Juntos" para desafios+clubes vs. entrada pela home).

### 7.1 Primeira vez: cadastro e onboarding
- **Vê:** animação de abertura do personagem (Quill entra correndo, vira o pingo do "i");
  formulário de e-mail+senha; após criar conta, 2-3 telas rápidas: escolher **meta inicial**
  sugerida em alvo diário ("10 min/dia?") e convite para adicionar o 1º livro.
- **Edita:** e-mail, senha, nome de exibição, username, meta inicial (opcional, dá para pular).

### 7.2 Home (aba Quill) — "estatísticas é a home do produto"
- **Vê:** saudação do personagem (estado atual: acordado/cochilando/comemorando);
  **pílulas** escolhidas (streak, minutos, pág/dia…); heatmap/calendário do mês;
  progresso da meta com o alvo diário recalculado; card do **relatório semanal** quando
  fecha a semana; atalhos para retrospectiva e conquistas; se houver **desafio ativo**,
  mini-card com posição no ranking e último check-in do grupo.
- **Edita:** quais pílulas aparecem (catálogo, filtro de exibição); metas (criar/ajustar/
  arquivar); nada mais é editável aqui — a home é leitura.

### 7.3 Registrar leitura (aba Ler)
- **Vê:** botão play grande; com sessão ativa, o cronômetro + **cena do Quill lendo**;
  indicador discreto de sessão ativa ao navegar para outras abas; botão de pausa; link
  "registrar manualmente" para leituras passadas.
- **Edita:** iniciar/pausar/encerrar sessão; no modal de encerramento — páginas lidas,
  tags de qualidade, vínculo opcional com livro (busca na própria estante; padrão: sem
  vínculo), e **"publicar como check-in"** se houver desafio ativo (com foto e comentário
  opcionais). No registro manual — data, duração, páginas, livro, tags.

### 7.4 Estante
- **Vê:** grade 3×N de capas (real ou ilustração Quill), pill de status por livro; botão Add.
- **Edita:** nada direto na grade (toque abre o livro); botão Add abre o cadastro.

### 7.5 Adicionar livro
- **Vê:** formulário único e curto; preview da capa (busca Open Library ou ilustração
  gerada); campos opcionais recolhidos.
- **Edita:** título (obrigatório), autor, total de páginas, status inicial, playlist
  Spotify, modo de capa (real/ilustração).

### 7.6 Página do livro
- **Vê:** capa grande, status, stats do livro (tempo total, pág/dia, dias lidos,
  **pág/hora**, **previsão de término**), player Spotify, highlights (grade de fotos),
  comentários próprios/do grupo (com trava de spoiler quando social ativar).
- **Edita:** status; dados do livro (título, autor, páginas, playlist); adicionar/remover
  highlight (foto + página + nota); escrever/apagar comentário; nota em estrelas (fase
  social); **não** inicia sessão aqui — sessão é sempre pela aba Ler.

### 7.7 Metas
- **Vê:** metas ativas com progresso e **alvo diário derivado** ("faltam 620 pág no ano ≈
  14/dia"); histórico de metas concluídas.
- **Edita:** criar meta (tipo: livros/ano, páginas/dia, minutos/dia, páginas no período);
  ajustar valor/prazo; pausar/arquivar.

### 7.8 Conquistas
- **Vê:** todas as badges — desbloqueadas coloridas, bloqueadas em cinza **com nome,
  descrição e progresso** ("faltam 2 dias"); agrupadas por nível de dificuldade.
- **Edita:** nada (opcional: escolher 1-3 para exibir no perfil).

### 7.9 Desafios — lista e criação
- **Vê:** desafios ativos (card com nome, dias restantes, sua posição, última atividade),
  encerrados (com recap) e campo "entrar com código".
- **Edita:** criar desafio (nome, descrição, capa, datas, métrica, regra de check-in,
  livro único ou livre, participar do ranking sim/não); entrar via código; sair de desafio.

### 7.10 Desafio — detalhe (3 seções, estilo GymRats)
- **Feed** — **vê:** check-ins de todos (duração/páginas lidas, comentário e foto quando
  houver, reações);
  **edita:** reagir, comentar, apagar o próprio check-in.
- **Ranking** — **vê:** placar pela métrica do desafio (só membros opt-in), com destaque
  da própria posição; **edita:** o próprio opt-in de ranking (a qualquer momento).
- **Calendário** — **vê:** grade dias × membros com quem fez check-in em cada dia;
  **edita:** nada.
- **Criador também edita:** dados do desafio (antes do início), remover membro, encerrar.

### 7.11 Clube de leitura (fase posterior)
- **Vê:** cronograma (capítulo da semana), barra de progresso coletivo, discussão por
  capítulo (com trava de spoiler pelo seu progresso).
- **Edita:** seu progresso (via sessões vinculadas ao livro), mensagens, reações;
  criador edita cronograma e livro atual.

### 7.12 Retrospectiva (mensal/anual)
- **Vê:** sequência de telas "wrapped" (totais, recordes, livro do período, melhor
  horário, passeio pelo bosque do período) — narrada pelo Quill.
- **Edita:** nada; ação única de **compartilhar** (gera card Stories).

### 7.13 Compartilhar
- **Vê:** preview do card 1080×1920 no template 90s com o personagem.
- **Edita:** escolher variação do miolo quando aplicável; compartilhar (Web Share) ou baixar.

### 7.14 Perfil
- **Vê:** avatar, nome, username, badges em destaque, resumo público (livros terminados,
  streak) conforme privacidade.
- **Edita:** avatar, display name, username, preferências de pílulas e privacidade padrão
  (público/privado de comentários e highlights).

## 8. Modelo de dados (generalizado para mídia)

> Decisão-chave: modelar um conceito genérico de **item de mídia** já em v1, para que
> *jogos* entrem no futuro sem migração pesada. Em v1, todo item tem `type = 'book'`.
> Detalhe completo (tipos, relações, RLS) em `supabase/schema.sql` + migrações aplicadas.

- **profiles** — perfil (username, display_name, avatar_url, metrics_prefs).
- **media_items** — item (type book/game, title, creator, cover_url/cover_kind/cover_palette,
  total_units, status, spotify_url, datas).
- **sessions** — leitura/jogatina (duração, unit_start/end, quality_tags; `item_id` nullable).
- **highlights** — fotos de trechos (image_url = *path* no bucket privado, unit_ref, note, is_public).
- **comments** — comentários (scope item/chapter/passage, chapter_ref, passage_ref,
  gif_url, is_public).
- **ratings** — nota por item (1 por usuário).
- **goals** — metas (tipo, valor, período; alvo diário é derivado, não armazenado).
- **groups** / **group_members** / **group_schedule** — base de desafio e clube (format,
  scoring_metric, competes, cronograma). **v2 acrescenta ao desafio:** `starts_at`,
  `ends_at`, `invite_code`, `cover_url`, `checkin_rule`, `item_id` opcional (livro único).
- **challenge_checkins** *(novo)* — check-in publicado (group_id, session_id, photo_path
  opcional, note; reações/comentários de check-in reutilizam um mecanismo de `comments`
  ou tabela própria `checkin_reactions` — decidir na fase).
- **achievements** / **user_achievements** *(novo, fase de gamificação)* — catálogo de
  conquistas (nome, descrição, critério, nível) e desbloqueios por usuário.
- **character_state / reader_forest** *(novo, fase do personagem)* — humor do Quill e
  estado do bosque (uma árvore por livro; derivável de sessions + media_items;
  materializar só se necessário).
- **friendships** — amizades. **recommendations** — indicações (source friend/system).

**Storage:** buckets `covers`, `avatars` (públicos), `highlights` (privado, signed URLs),
`challenge-photos` (novo — visível só a membros do grupo, via signed URL ou policy de
membership). **RLS por tabela** — habilitada em todas; dados de grupo só para membros;
trava de spoiler na camada de aplicação.

## 9. Arquitetura técnica
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind. Mobile-first.
- **Backend/dados:** Supabase (Auth, Postgres, Storage, RLS).
- **GIFs:** Tenor/Giphy. **Spotify:** iframe embed. **Compartilhar:** html-to-image + Web Share API.
- **Personagem/animação:** Rive (preferido — state machine reage a eventos do app) ou
  Lottie; pesquisa registrada em `MARCA-Quill.md`.
- **Hospedagem:** Vercel (free). **Construção:** Claude Code; **design** no Claude Design.
- **Recomendações (futuro):** n8n self-hosted ou Supabase Edge Function.
- **Free tier Supabase:** projeto pausa após ~7 dias sem requisições → keepalive agendado.

## 10. Requisitos não-funcionais
- **UX:** simples e intuitivo acima de tudo; telas limpas. Tracking nunca vira obrigação
  (registro manual sempre disponível; timer nunca bloqueia navegação).
- **Mobile-first:** melhor experiência no celular; responsivo.
- **Design — estética anos 90 suavizada ("Opção A", vigente desde a Fase 2):** base
  papel/creme; superfícies ilustradas (capas, cenários) com borda fina marrom-quente e
  preenchimentos pastel suaves; acentos saturados (coral, verde-musgo, mostarda, navy) e
  sombra dura reservados para UI interativa (botões, pills). Tipografia chunky nos
  destaques + serifada quente nos títulos. Tokens em `src/app/globals.css` são a fonte da
  verdade.
- **Acessibilidade (regra permanente):** contraste AA verificado em toda combinação
  texto/cor; status nunca comunicado só por cor.
- **Tom emocional:** gamificação sem culpa — nada de punição, cobrança ou dark patterns
  (lições Bookly/Duolingo/Forest na §5).
- **Privacidade:** RLS rigoroso; separar público de privado; conteúdo de desafio visível
  só a membros.
- **Custo:** priorizar plataformas gratuitas.

## 11. Roadmap por fases (v2)
1. ✅ **Base:** auth + profiles + Supabase conectado. *(feita)*
2. ✅ **Estante:** add livro (capa, título, Spotify), grid, status. *(feita)*
3. ✅ **Página do livro:** sessões, tempo, páginas/dia, highlights, comentários. *(feita —
   inclui a correção de navegação: tab bar + sessão desacoplada do livro em `/ler`)*
4. **Gamificação individual:** calendário/heatmap, sequências, metas com alvo diário,
   pílulas, stats avançadas (pág/hora, previsão de término, recordes), relatório
   semanal/mensal, retrospectiva, **conquistas com progressão visível**, pausa no timer,
   registro manual.
5. **Desafios (GymRats):** criar/entrar por código, check-in por timer ou registro manual
   (foto opcional), feed com reações, ranking opt-in, calendário do desafio, recap de
   encerramento.
6. **Personagem vivo:** animação de abertura, cena da sessão de leitura, reações e
   estágios de crescimento. *(Pode andar em paralelo às fases 4-5 — depende de produção
   de arte; ver MARCA-Quill.md.)*
7. **Social ampla:** comentários por nível + trava de spoiler, notas, GIFs, feed de
   amigos, indicar livro.
8. **Compartilhar cards** no Instagram Stories (reaproveita relatórios, recaps e conquistas).
9. **Clube de leitura:** grupo contínuo, cronograma, progresso coletivo, chat.
10. **Descoberta + (futuro) n8n.**

> Mudança v1→v2: desafios subiram na fila (eram fase 7) por serem o foco atual junto com
> gamificação; social ampla e cards vêm depois porque desafio já entrega o "ler juntos"
> com um recorte social pequeno e fechado.

## 12. Expansão futura: Jogos
Mesma proposta aplicada a jogos (`type='game'`): add jogos; status `quero_jogar`/`jogando`/
`zerei`/`abandonei`/`platinei`; "highlights" viram **tutoriais/dicas de fase** e prints;
notas e comentários (mesma comunidade); compartilhar; tempo para zerar. Desafios também
generalizam ("zerar X juntos").
**Tempo de jogo:** Steam Web API expõe playtime (viável); consoles são fechados
(via terceiros); Nintendo praticamente manual; fallback universal = registro manual.
Como as tabelas já são genéricas, a maior parte do trabalho é de UI e rotulagem.

## 13. Exploração futura: Integrações de dados
- **Kindle:** sem API oficial de progresso; caminho = importar *destaques* (exportação de notas).
- **Goodreads:** API pública praticamente fechada; avaliar CSV.
- **StoryGraph:** avaliar import/export por CSV.
- **Steam:** Web API aberta — melhor candidato para jogos.
- Toda integração = importação **opcional** que popula as tabelas existentes; verificar o
  estado atual de cada API no momento da implementação.

## 14. Riscos e questões em aberto
- Limites de free tier (Supabase pause) — mitigar com keepalive.
- RLS/segurança exige atenção explícita por tabela; fotos de desafio precisam de policy
  de membership bem testada.
- Complexidade da trava anti-spoiler (validar na camada de query).
- Produção da arte/animação do personagem tem custo e dependência externa (ilustração,
  Rive) — não deixar as fases 4-5 travarem esperando a 6.
- Equilíbrio do ranking: mesmo opt-in, cuidado para o desafio não virar cobrança (tom dos
  textos e do personagem importa).
- Manter v1 enxuto para preservar a simplicidade da UX.

## 15. Métricas de sucesso (projeto pessoal)
- O autor usa de forma consistente (sequência ativa).
- Amigos convidados voltam e registram leituras.
- Sessões de leitura iniciadas por semana.
- **Ao menos um desafio concluído com 3+ participantes e check-ins na última semana.**
- Retrospectivas/cards efetivamente compartilhados.
- Sensação subjetiva: o app deixou a leitura mais gostosa, não mais pesada.
