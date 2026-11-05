import Link from "next/link";
import { BotaoVoltar } from "@/components/botao-voltar";
import { ConversaAtualizacao } from "@/components/conversa-atualizacao";
import { NotaItem } from "@/components/nota-item";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { BookThumb } from "@/components/book-thumb";
import { StatusEditor } from "@/components/status-editor";
import { RatingStars } from "@/components/rating-stars";
import { LivroAmigoCtas } from "@/components/livro-amigo-ctas";
import { LivroKebab } from "@/components/livro-kebab";
import { LivroAbas } from "@/components/livro-abas";
import { LivroDetalhes } from "@/components/livro-detalhes";
import { EmptyState } from "@/components/empty-state";
import { CommentComposer } from "@/components/comment-composer";
import { EditorPosicaoLinha, EditorPosicaoTile } from "@/components/editor-posicao";
import { CalendarioLivro } from "@/components/calendario-livro";
import { getFriends } from "@/lib/friends";
import {
  computeReadingStats,
  formatDuration,
  posicaoAtual,
  posicaoExibida,
  predictFinish,
} from "@/lib/reading-stats";
import { toSpotifyEmbedUrl } from "@/lib/spotify";
import { dataBR, segundosPorDiaDaSessao, todayLocalDateKey } from "@/lib/date-br";
import { nomeExibicao } from "@/lib/nome-exibicao";

const STATUS_LABEL: Record<string, string> = {
  want: "quero ler",
  reading: "lendo",
  finished: "terminei",
  recomendado: "recomendado",
  abandoned: "abandonei",
  platinum: "platinei",
};

const STATUS_STYLE: Record<string, string> = {
  want: "bg-mustard text-ink",
  reading: "bg-coral text-paper",
  finished: "bg-moss text-paper",
  recomendado: "bg-navy text-paper",
  abandoned: "bg-ink-soft text-paper",
  platinum: "bg-navy text-paper",
};

function StarsStatic({ stars }: { stars: number }) {
  return (
    <span aria-label={`${stars} de 5 estrelas`} className="text-lg tracking-tight">
      <span className="text-mustard">{"★".repeat(stars)}</span>
      <span className="text-ink/25">{"★".repeat(5 - stars)}</span>
    </span>
  );
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; conversa?: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const { error, conversa } = await searchParams;

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("media_items")
    .select(
      "id, user_id, title, creator, genre, status, is_recommended, recommendation_id, cover_kind, cover_url, cover_palette, spotify_url, total_units, total_chapters, started_at, finished_at",
    )
    .eq("id", id)
    .single();

  if (!item) notFound();

  const isOwner = item.user_id === userId;

  // Vindo do sino (curtida/comentário numa atualização): abre a "Conversa".
  const conversaBloco = conversa ? (
    <ConversaAtualizacao
      supabase={supabase}
      userId={userId}
      itemId={item.id as string}
      donoId={item.user_id as string}
      titulo={item.title as string}
      chave={conversa}
    />
  ) : null;

  if (!isOwner) {
    return (
      <>
        {conversaBloco}
        <FriendBookView item={item} userId={userId} supabase={supabase} />
      </>
    );
  }

  const [{ data: sessions }, { data: comments }, { data: myRating }, indicacao, { data: anteriores }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("started_at, ended_at, duration_seconds, unit_start, unit_end, chapter_end, created_at, cadastro")
        .eq("item_id", id),
      supabase
        .from("comments")
        .select("id, content, chapter_ref, scope, gif_url, is_public, created_at")
        .eq("item_id", id)
        .in("scope", ["item", "chapter"])
        .order("created_at", { ascending: true }),
      supabase
        .from("ratings")
        .select("stars")
        .eq("item_id", id)
        .eq("user_id", userId)
        .maybeSingle(),
      getIndicacao(supabase, item.recommendation_id as string | null),
      // Leituras já terminadas de um livro relido (a atual fica no livro).
      supabase
        .from("past_readings")
        .select("started_at, finished_at")
        .eq("item_id", id)
        .order("created_at", { ascending: true }),
    ]);
  const leiturasAnteriores = (anteriores ?? []) as { started_at: string | null; finished_at: string | null }[];

  const recomendado = item.is_recommended || item.status === "recomendado";

  const stats = computeReadingStats(sessions ?? []);
  const prediction = predictFinish(stats, item.total_units);
  // `computeReadingStats` só olha página (unit_end) — capítulo é só isso aqui.
  const posicao = posicaoExibida(
    { paginas: stats.currentPage, capitulos: posicaoAtual(sessions ?? []).capitulos },
    item,
  );
  // Do primeiro "lendo" até o "terminei" (ou até hoje, se ainda estiver
  // lendo) — mantém a data mesmo se passar por "abandonei" no meio.
  const diasLidos = item.started_at
    ? Math.max(
        1,
        Math.floor(
          (new Date(`${item.finished_at ?? todayLocalDateKey()}T00:00:00`).getTime() -
            new Date(`${item.started_at}T00:00:00`).getTime()) /
            86_400_000,
        ) + 1,
      )
    : null;
  // Minutos por dia neste livro, pro calendário da aba Leitura. Sessões de
  // cadastro da estante não são leitura de verdade.
  const segundosPorDia = new Map<string, number>();
  for (const s of sessions ?? []) {
    if (s.cadastro) continue;
    for (const [dia, seg] of segundosPorDiaDaSessao(s)) {
      segundosPorDia.set(dia, (segundosPorDia.get(dia) ?? 0) + seg);
    }
  }
  const minutosPorDia = Object.fromEntries(
    [...segundosPorDia].map(([dia, seg]) => [dia, Math.round(seg / 60)]),
  );
  const hoje = todayLocalDateKey();
  const terminado = item.status === "finished";
  const ultimoDiaLido = [...segundosPorDia.keys()].sort().at(-1);
  const embedUrl = item.spotify_url ? toSpotifyEmbedUrl(item.spotify_url) : null;

  const statusStyle = STATUS_STYLE[item.status] ?? "bg-paper text-ink";
  const statusLabel = STATUS_LABEL[item.status] ?? item.status;

  // Uma linha no topo resume as datas — o detalhe (e a edição) fica na aba
  // "Detalhes". Quero ler/recomendado não têm data de leitura.
  const resumoDatas =
    item.status === "finished"
      ? item.finished_at
        ? item.started_at
          ? `Lido de ${dataBR(item.started_at)} a ${dataBR(item.finished_at)}`
          : `Terminado em ${dataBR(item.finished_at)}`
        : "Sem data de término"
      : item.started_at && (item.status === "reading" || item.status === "abandoned")
        ? `${leiturasAnteriores.length > 0 ? "Relendo desde" : "Comecei em"} ${dataBR(item.started_at)}`
        : null;
  const periodoLeitura = (l: { started_at: string | null; finished_at: string | null }) =>
    l.started_at && l.finished_at
      ? `${dataBR(l.started_at)} a ${dataBR(l.finished_at)}`
      : l.finished_at
        ? `terminada em ${dataBR(l.finished_at)}`
        : "sem data";

  // Calendário de livro relido: início e fim de cada leitura nas datas
  // gravadas. Livro lido uma vez segue com as marcas do primeiro/último dia
  // lido (ver CalendarioLivro).
  const marcasCalendario: Record<string, string> | undefined =
    leiturasAnteriores.length > 0
      ? (() => {
          const marcas: Record<string, string[]> = {};
          const marcar = (dia: string | null, rotulo: string) => {
            if (dia) (marcas[dia] ??= []).push(rotulo);
          };
          for (const l of [
            ...leiturasAnteriores,
            { started_at: item.started_at, finished_at: terminado ? item.finished_at : null },
          ]) {
            marcar(l.finished_at, "fim");
            marcar(l.started_at, "início");
          }
          return Object.fromEntries(Object.entries(marcas).map(([d, r]) => [d, r.join("/")]));
        })()
      : undefined;

  return (
    <div className="flex flex-1 flex-col bg-paper">
      {conversaBloco}
      {/* Header mustard — Lovable style */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-2 border-ink bg-mustard px-3 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/estante"
            aria-label="Voltar para a estante"
            className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm"
          >
            ‹
          </Link>
          <h1 className="font-display text-lg uppercase leading-none tracking-tight text-ink">
            Meu livro
          </h1>
        </div>
        <LivroKebab itemId={item.id} titulo={item.title} />
      </header>

      <div className="space-y-6 p-6">
        {error && <p className="text-sm font-medium text-coral">{error}</p>}

        {/* Hero: capa + info */}
        <section className="flex gap-5">
          <BookThumb item={item} className="shadow-[4px_4px_0_0_var(--color-ink)]" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span
                className={`inline-flex items-center border-2 border-ink px-2 py-0.5 font-display text-[10px] uppercase tracking-wider ${statusStyle}`}
              >
                {statusLabel}
              </span>
              {/* A marca aparece junto do status de leitura — quando o status
                  já é "recomendado" (ainda não decidiu), uma etiqueta basta. */}
              {recomendado && item.status !== "recomendado" && (
                <span
                  className={`inline-flex items-center border-2 border-ink px-2 py-0.5 font-display text-[10px] uppercase tracking-wider ${STATUS_STYLE.recomendado}`}
                >
                  {STATUS_LABEL.recomendado}
                </span>
              )}
            </div>
            <h2 className="font-display text-xl uppercase leading-tight text-ink">
              {item.title}
            </h2>
            {item.creator && (
              <p className="font-serif text-sm italic text-ink-soft">{item.creator}</p>
            )}
            <div className="mt-1">
              <RatingStars itemId={item.id} initialStars={myRating?.stars ?? 0} />
            </div>
            {resumoDatas && <p className="text-xs text-ink-soft">{resumoDatas}</p>}
            {leiturasAnteriores.length > 0 && (
              <ul className="text-[11px] text-ink-soft">
                {leiturasAnteriores.map((l, i) => (
                  <li key={i}>
                    {i + 1}ª leitura: {periodoLeitura(l)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Quem indicou + recado. Só existe quando o livro chegou por uma
            indicação — livro marcado como recomendado à mão não tem de quem. */}
        {indicacao && (
          <section className="border-2 border-ink bg-navy p-3 text-paper shadow-hard-sm">
            <p className="font-display text-[10px] uppercase tracking-widest text-paper/70">
              Indicação
            </p>
            <p className="mt-1 text-sm">
              <strong className="font-bold">{indicacao.deQuem}</strong> indicou esse livro pra você
            </p>
            {indicacao.recado && (
              <p className="mt-2 border-l-2 border-mustard pl-2 font-serif text-sm italic leading-relaxed">
                “{indicacao.recado}”
              </p>
            )}
          </section>
        )}

        {/* Três abas pra não empilhar tudo numa rolagem só: o andamento da
            leitura, a ficha do livro (edita no lugar — substitui a antiga
            tela Editar) e as anotações. */}
        <LivroAbas
          leitura={
            <>
              {/* Status editor */}
              <section className="border-2 border-ink bg-paper p-3 shadow-hard-sm">
                <p className="mb-2 font-display text-[10px] uppercase tracking-widest text-ink-soft">
                  Mudar status
                </p>
                <StatusEditor itemId={item.id} status={item.status} isRecommended={recomendado} />
              </section>

              {/* Páginas é o dado que a maioria dos livros tem (capítulo é a
                  exceção) — ganha a linha inteira, com botão de salvar explícito.
                  Sem total cadastrado, o próprio editor pede o total (ver
                  editor-posicao.tsx). */}
              <EditorPosicaoLinha itemId={item.id} atual={posicao.paginas} total={item.total_units} unidade="pages" />

              {prediction && (
                <div className="border-2 border-moss bg-moss/10 px-3 py-2.5">
                  <p className="text-sm text-ink">
                    Nesse ritmo, você termina em{" "}
                    <strong>~{prediction.daysRemaining} dias</strong>{" "}
                    ({prediction.dateLabel}).
                  </p>
                </div>
              )}

              {/* Os outros quatro números, 2×2 — Capítulos aqui dobra como editor
                  de posição (mesmo cálculo que alimenta a % da estante). */}
              <section className="grid grid-cols-2 gap-2">
                <StatBox label="Tempo total" value={formatDuration(stats.totalSeconds)} />
                <StatBox label="Pág. / dia" value={String(stats.pagesPerDay)} />
                <EditorPosicaoTile itemId={item.id} atual={posicao.capitulos} total={item.total_chapters} unidade="chapters" />
                <StatBox
                  label="Dias lidos"
                  value={diasLidos != null ? String(diasLidos) : "—"}
                />
              </section>

              {ultimoDiaLido && (
                <CalendarioLivro
                  itemId={item.id}
                  minutosPorDia={minutosPorDia}
                  ultimoDia={terminado || item.status === "abandoned" ? ultimoDiaLido : hoje}
                  hoje={hoje}
                  terminado={terminado}
                  totalPaginas={item.total_units}
                  marcas={marcasCalendario}
                />
              )}

              {embedUrl && (
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="152"
                  style={{ borderRadius: 0, marginBottom: "0.5rem" }}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="border-2 border-ink"
                />
              )}
            </>
          }
          detalhes={
            <LivroDetalhes
              itemId={item.id}
              status={item.status}
              title={item.title}
              creator={item.creator}
              genre={item.genre}
              totalUnits={item.total_units}
              totalChapters={item.total_chapters}
              spotifyUrl={item.spotify_url}
              coverKind={item.cover_kind}
              startedAt={item.started_at}
              finishedAt={item.finished_at}
            />
          }
          notas={
            <section className="space-y-3">
              {(comments ?? []).length === 0 ? (
                <div className="border-2 border-dashed border-ink/40">
                  <EmptyState
                    compacto
                    mascote="escrevendo"
                    titulo="Nenhuma nota ainda"
                    texto="Anote uma frase, uma dúvida ou o que esse capítulo te fez sentir. Começa privado — você decide o que vira público."
                  />
                </div>
              ) : (
                <ul className="space-y-3">
                  {(comments ?? []).map((c) => (
                    <NotaItem key={c.id} nota={c} itemId={item.id} />
                  ))}
                </ul>
              )}

              <CommentComposer itemId={item.id} />
            </section>
          }
        />
      </div>
    </div>
  );
}

async function getIndicacao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recommendationId: string | null,
): Promise<{ deQuem: string; recado: string | null } | null> {
  if (!recommendationId) return null;
  const { data: rec } = await supabase
    .from("recommendations")
    .select("from_user_id, message")
    .eq("id", recommendationId)
    .maybeSingle();
  if (!rec) return null;
  const { data: perfil } = rec.from_user_id
    ? await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", rec.from_user_id)
        .maybeSingle()
    : { data: null };
  return {
    deQuem: perfil
      ? nomeExibicao(perfil.display_name as string | null, perfil.username as string | null)
      : "um amigo",
    recado: (rec.message as string | null)?.trim() || null,
  };
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-ink bg-paper py-3 text-center shadow-hard-sm">
      <div className="font-display text-base text-ink">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wide text-ink-soft">{label}</div>
    </div>
  );
}

type ItemRow = {
  id: string;
  user_id: string;
  title: string;
  creator: string | null;
  status: string;
  cover_kind: string;
  cover_url: string | null;
  cover_palette: number;
};

async function FriendBookView({
  item,
  userId,
  supabase,
}: {
  item: ItemRow;
  userId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const [{ data: owner }, { data: ownerRating }, { data: comments }, friends] =
    await Promise.all([
      supabase.from("profiles").select("display_name, username").eq("id", item.user_id).maybeSingle(),
      supabase
        .from("ratings")
        .select("stars")
        .eq("item_id", item.id)
        .eq("user_id", item.user_id)
        .maybeSingle(),
      supabase
        .from("comments")
        .select("id, content, chapter_ref, scope, gif_url, created_at")
        .eq("item_id", item.id)
        .eq("is_public", true)
        .in("scope", ["item", "chapter"])
        .order("created_at", { ascending: true }),
      getFriends(supabase, userId),
    ]);

  const ownerName = nomeExibicao(owner?.display_name as string | null, owner?.username as string | null);
  const statusStyle = STATUS_STYLE[item.status] ?? "bg-paper text-ink";
  const statusLabel = STATUS_LABEL[item.status] ?? item.status;

  return (
    <div className="flex flex-1 flex-col bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-paper px-3 py-3">
        <BotaoVoltar
          fallback="/estante?view=amigos"
          className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </BotaoVoltar>
        <h1 className="font-display text-lg uppercase leading-none tracking-tight text-ink">
          Na estante de{" "}
          <span className="text-coral">{ownerName}</span>
        </h1>
      </header>

      <div className="flex-1 pb-40">
        {/* Hero */}
        <section className="flex gap-5 px-5 pt-6">
          <BookThumb item={item} className="shadow-[4px_4px_0_0_var(--color-ink)]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span
              className={`inline-flex w-fit items-center border-2 border-ink px-2 py-0.5 font-display text-[10px] uppercase tracking-wider ${statusStyle}`}
            >
              {statusLabel}
            </span>
            <h2 className="font-serif text-xl font-bold leading-tight text-ink">
              {item.title}
            </h2>
            {item.creator && (
              <p className="font-serif text-sm italic text-ink-soft">{item.creator}</p>
            )}
            <div className="mt-1">
              {ownerRating?.stars ? (
                <StarsStatic stars={ownerRating.stars} />
              ) : (
                <span className="text-xs text-ink/55">sem nota ainda</span>
              )}
            </div>
          </div>
        </section>

        {/* Comentários */}
        <section className="px-5 pt-8">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm uppercase tracking-wider text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-moss font-display text-[10px] text-paper">
              {ownerName.charAt(0).toUpperCase()}
            </span>
            Comentários de {ownerName}
          </h3>

          {(!comments || comments.length === 0) ? (
            <div className="border-2 border-dashed border-ink/40 p-6 text-center">
              <p className="font-serif text-sm italic text-ink-soft">
                {ownerName} ainda não deixou comentários públicos neste livro.
              </p>
            </div>
          ) : (
            <div className="relative space-y-5">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-ink/10" />
              {comments.map((c) => (
                <div key={c.id} className="relative pl-10">
                  <div className="absolute left-[9px] top-3 h-3 w-3 rounded-full border-2 border-ink bg-mustard" />
                  <article className="border-2 border-ink bg-paper p-3 shadow-hard-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {c.scope === "chapter" && c.chapter_ref != null && (
                        <span className="border border-ink bg-ink px-1.5 py-0.5 font-display text-[9px] uppercase tracking-wider text-paper">
                          cap. {c.chapter_ref}
                        </span>
                      )}
                    </div>
                    {c.content && (
                      <p className="font-serif text-sm leading-relaxed text-ink">
                        {c.content}
                      </p>
                    )}
                    {c.gif_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.gif_url}
                        alt="GIF"
                        className="mt-1.5 max-h-32 border-2 border-cover-border"
                      />
                    )}
                  </article>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* CTAs presos logo acima da tab bar. Eram `sticky bottom-0` dentro do
          rolador interno: o "Adicionar à minha estante" desenhava no rodapé mas
          o toque caía noutro ponto. */}
      <div
        className="fixed inset-x-0 z-20 mx-auto flex w-full max-w-[390px] flex-col gap-2 border-t-2 border-ink bg-paper p-4"
        style={{ bottom: "var(--tabbar-h)" }}
      >
        <LivroAmigoCtas item={item} friends={friends} />
      </div>
    </div>
  );
}
