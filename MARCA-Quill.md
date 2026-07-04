# Marca e experiência — Quill

**Doc vivo.** Aqui ficam ideias de identidade, personagem, animação e áudio que ainda
não foram implementadas — servem pra não perder o fio da meada entre conversas, e
pra guiar decisões de fase (gamificação, sessão de leitura, etc.) quando chegar a hora.
Identidade visual "estática" (cores, tipografia, formas Memphis) já está descrita em
`CLAUDE.md` — este doc foca no que tem *vida*: mascote, animação, som, progressão.

## Princípio de acessibilidade (regra permanente)

- **Contraste mínimo AA (WCAG)** entre texto e fundo, sempre — checar antes de fixar
  qualquer combinação de cor de texto sobre cor de fundo, não assumir visualmente.
  Ex.: texto claro (`paper`) só em cima de cores realmente escuras (navy, moss-dark);
  em cima de coral/moss "vivos", usar tinta escura ou tirar o texto de cima da cor.
- **Nunca depender só de cor** pra transmitter informação de status — combinar com
  posição, forma, contorno ou texto (ex.: pill de status também tem label textual em
  algum lugar da tela, não só a cor).
- Isso vale pra toda tela nova daqui pra frente, não só a estante.

## Mascote: Quill (o personagem)

Uma sementinha **muito simpática, carismática e um pouco desajeitada** — a cara do
app quando ele "ganha vida". Referências de tom/estilo: os Korok da Floresta Korok
(Zelda), minifigs da LEGO, o mascote da Claude/Anthropic, os personagens de
Stardew Valley.

**Regra de uso: pontual, não onipresente.** O personagem aparece só em momentos
específicos e importantes — não em toda tela — pra não infantilizar a experiência.
Por enquanto, os dois momentos previstos são:

1. **Tela de login/abertura do app.** Cena documentada (ainda não ilustrada):
   Quill entra correndo, meio *clumsy*; dá um "oi" sem graça, bochechas coradas.
   A palavra **"Quill"** desliza da direita pra esquerda e "joga" o personagem pro
   alto — ele vira o pinguinho do "i" de Quill.
2. **Início de uma sessão de leitura** (o timer estilo Forest, PRD 5.3). Quill
   aparece sentado num cenário aconchegante, virando as páginas de um livro, em
   loop simples — estética "lofi girl" (a garota estudando/lendo com música lo-fi).

### Cenário da sessão de leitura — sugestão de abordagem

Pra não fugir da identidade visual já estabelecida (formas Memphis achatadas, sem
gradiente), a recomendação é **não tentar imitar o estilo pintado do lofi girl
original** — em vez disso, montar o cenário aconchegante (estante ao fundo,
luminária, planta) no mesmo estilo flat do resto do app. Poucas camadas, só 1-2
elementos com movimento leve (personagem virando página; talvez uma cortina ou
luz de luminária piscando) — não precisa ser complexo pra funcionar.

**Tecnicamente** (só pesquisa futura, não decidido): [Rive](https://rive.app) tende
a caber melhor que vídeo/GIF pra isso — animação vetorial leve, com "state machine"
(dá pra ter estados tipo parado / sentado-lendo / feliz que reagem a eventos do
app), tem free tier pra prototipar. Lottie é uma alternativa mais simples
(exportação do After Effects), mas menos interativa. Onde produzir a arte em si
(ilustrador freelancer, ferramenta de IA, etc.) — decidir depois, aceitando que
pode ter um custo pequeno envolvido.

## Mecânica "tamagotchi" (ainda em aberto)

Referências citadas: a trilha + passarinho do Duolingo, a floresta de árvores do
Forest (escolher espécie, plantar, ver crescer). A ideia é uma versão **bem mais
simples** dessa lógica, ligada ao personagem Quill e ao progresso de leitura do
usuário — ainda sem desenho de mecânica definido. Retomar quando a fase de
gamificação (fase 4 do roadmap) estiver mais perto.

## Áudio — "juiciness"

Sons pequenos e satisfatórios pra ações do app (virar página, terminar sessão,
bater meta, etc.) — ainda não escolhidos, mas fontes candidatas pra pesquisar:

- **[freesound.org](https://freesound.org)** — banco enorme, filtrar por licença CC0.
- **[kenney.nl](https://kenney.nl/assets?q=audio)** — assets de jogo gratuitos (CC0),
  inclui pacotes prontos de "UI audio".
- **sfxr / [jsfxr](https://sfxr.me)** — gera efeitos retrô 8-bit direto no navegador,
  grátis; combina bem com a estética 90s do app pra sons curtos de interface.
- **Sonniss GDC bundles** — pacotes anuais gratuitos de áudio de jogo, alta
  qualidade, lançados perto da GDC.
- **[Mixkit](https://mixkit.co/free-sound-effects)** — efeitos sonoros gratuitos,
  licença simples.

## Proposta de brand v3 — "Quill, a semente com pena" (2026-07-04, aguardando aprovação)

Revisão da proposta v2 após feedback: **menos infantil**. Substitui o tom da seção
"Mascote" acima onde houver conflito (sai o "oi sem graça com bochechas coradas";
entra uma entrada confiante-desastrada: tropeça, se recompõe, finge que nada aconteceu).

**Núcleo mantido:** a semente com uma **pena de escrever (quill) como folha** no topo —
amarra nome ↔ personagem ↔ leitura num único símbolo e é a assinatura de silhueta
(legível em 24 px).

**Direção visual — "vintage cartoon com atitude"** (refs: mascote da Claude/Anthropic,
Yoshi, **Cuphead**, **Minions**, Koroks de Zelda, Stardew Valley):
- Olhos grandes estilo cartoon anos 30 (Cuphead): ovais com pupila "pie-cut" — todo o
  range de expressão vem de olhos + sobrancelhas, não de fofura.
- **Sobrancelhas expressivas** = a chave da personalidade adulta (ceticismo, julgamento,
  drama, tédio).
- Braços/pernas finos "rubber-hose" com luvinhas (Cuphead/Minions) — dá atitude e
  linguagem corporal sem complexidade de rig.
- **Sai:** bochechas coradas como padrão (só em momento raro de vergonha), proporção
  bebê, olhar desamparado.
- Paleta do app: corpo creme/marrom-quente, pena verde-musgo, acentos coral/mostarda;
  flat Memphis com borda fina marrom (padrão "Opção A" — personagem é superfície
  ilustrada, não UI).

**Personalidade — humor seco e travesso, nunca cobrança:**
- Comemora dramático (meta batida, livro terminado) — exagero cômico, não fofura.
- **Julga em silêncio** quando a tag é "parei para olhar o celular" (olhar de lado,
  sobrancelha reta — a piada é a contenção).
- Sonolento em sessão de madrugada; cochila se você some por dias (nada de murchar/
  morrer — anti-Forest, anti-Duolingo-culpa).
- Travessura tipo Minions nos momentos de marca (login, retrospectiva, empty states).

**Semente → árvore, explorado em duas camadas (decisão de design):**
1. **O personagem NÃO vira árvore** — mascote precisa de forma fixa pra construir marca
   (Yoshi não evolui). Ele é o *espírito/jardineiro* do bosque (vibe Korok).
2. **O Bosque do leitor** é quem cresce: **cada livro cultiva uma árvore** — semente ao
   começar, broto enquanto lê, árvore jovem com a constância, árvore com frutos ao
   terminar. O bosque acumula (visão anual = retrospectiva "passeando pelo bosque");
   a constância (streak) acelera o crescimento da árvore atual. Livro abandonado não
   mata a árvore — ela fica pequena, parada (sem punição visual).

**Onde aparece** (regra "pontual, não onipresente" mantida): login, cena da sessão de
leitura, celebrações, retrospectiva, estados vazios, e assinando os cards de Stories.

## Status

Nada disso está implementado. Este doc é só o registro da visão pra não se perder —
cada peça (personagem, cenário, mecânica, áudio) entra em pauta quando a fase
correspondente do roadmap chegar (sessão de leitura = fase 3; gamificação = fase 4).
