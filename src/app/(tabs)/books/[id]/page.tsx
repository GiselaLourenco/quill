import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { BookThumb } from "@/components/book-thumb";
import { StatusEditor } from "@/components/status-editor";
import { RatingStars } from "@/components/rating-stars";
import { LivroAmigoCtas } from "@/components/livro-amigo-ctas";
import { LivroKebab } from "@/components/livro-kebab";
import { EmptyState } from "@/components/empty-state";
import { CommentComposer } from "@/components/comment-composer";
import { getFriends } from "@/lib/friends";
import {
  computeReadingStats,
  formatDuration,
  predictFinish,
} from "@/lib/reading-stats";
import { toSpotifyEmbedUrl } from "@/lib/spotify";
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
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("media_items")
    .select(
      "id, user_id, title, creator, status, cover_kind, cover_url, cover_palette, spotify_url, total_units",
    )
    .eq("id", id)
    .single();

  if (!item) notFound();

  const isOwner = item.user_id === userId;

  if (!isOwner) {
    return <FriendBookView item={item} userId={userId} supabase={supabase} />;
  }

  const [{ data: sessions }, { data: comments }, { data: myRating }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("started_at, duration_seconds, unit_end")
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
    ]);

  const stats = computeReadingStats(sessions ?? []);
  const prediction = predictFinish(stats, item.total_units);
  const embedUrl = item.spotify_url ? toSpotifyEmbedUrl(item.spotify_url) : null;

  const statusStyle = STATUS_STYLE[item.status] ?? "bg-paper text-ink";
  const statusLabel = STATUS_LABEL[item.status] ?? item.status;

  return (
    <div className="flex min-h-full flex-col bg-paper">
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
          <h1 className="font-display text-lg uppercase tracking-tight text-ink">
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
            <div>
              <span
                className={`inline-flex items-center border-2 border-ink px-2 py-0.5 font-display text-[10px] uppercase tracking-wider ${statusStyle}`}
              >
                {statusLabel}
              </span>
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
          </div>
        </section>

        {/* Status editor */}
        <section className="border-2 border-ink bg-paper p-3 shadow-hard-sm">
          <p className="mb-2 font-display text-[10px] uppercase tracking-widest text-ink-soft">
            Mudar status
          </p>
          <StatusEditor itemId={item.id} status={item.status} />
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-2">
          <StatBox label="Tempo total" value={formatDuration(stats.totalSeconds)} />
          <StatBox label="Pág. / dia" value={String(stats.pagesPerDay)} />
          <StatBox label="Pág. / hora" value={String(stats.pagesPerHour)} />
          <StatBox label="Dias lidos" value={String(stats.daysRead)} />
        </section>

        {prediction && (
          <div className="border-2 border-moss bg-moss/10 px-3 py-2.5">
            <p className="text-sm text-ink">
              Nesse ritmo, você termina em{" "}
              <strong>~{prediction.daysRemaining} dias</strong>{" "}
              ({prediction.dateLabel}).
            </p>
          </div>
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

        {/* Comentários / diário */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-ink">
            <span className="h-2 w-2 border border-ink bg-coral" />
            Minhas anotações
          </h3>

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
                <li
                  key={c.id}
                  className="border-2 border-ink border-l-8 border-l-navy bg-paper p-4 shadow-hard-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    {c.scope === "chapter" && c.chapter_ref != null && (
                      <span className="border border-ink bg-mustard px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">
                        cap. {c.chapter_ref}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                      {c.is_public ? "🌍 público" : "🔒 privado"}
                    </span>
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
                </li>
              ))}
            </ul>
          )}

          <CommentComposer itemId={item.id} />
        </section>
      </div>
    </div>
  );
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
    <div className="flex min-h-full flex-col bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-paper px-3 py-3">
        <Link
          href="/estante?view=amigos"
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="font-display text-base uppercase tracking-tight text-ink">
          Na estante de{" "}
          <span className="text-coral">{ownerName}</span>
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-40">
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

      {/* Fixed CTAs */}
      <div className="sticky bottom-0 flex flex-col gap-2 border-t-2 border-ink bg-paper p-4">
        <LivroAmigoCtas item={item} friends={friends} />
      </div>
    </div>
  );
}
