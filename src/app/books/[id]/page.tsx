import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { BookCover } from "@/components/book-cover";
import { StatusEditor } from "@/components/status-editor";
import { RatingStars } from "@/components/rating-stars";
import { RecommendButton } from "@/components/recommend-button";
import { CommentComposer } from "@/components/comment-composer";
import { getFriends } from "@/lib/friends";
import {
  computeReadingStats,
  formatDuration,
  predictFinish,
} from "@/lib/reading-stats";
import { toSpotifyEmbedUrl } from "@/lib/spotify";

const STATUS_LABEL: Record<string, string> = {
  want: "quero ler",
  reading: "lendo",
  finished: "terminei",
  recomendado: "recomendado",
  abandoned: "abandonei",
  platinum: "platinei",
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

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/estante" aria-label="Voltar para a estante" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Página do livro</span>
      </header>

      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        {error && <p className="mb-4 text-sm font-medium text-coral">{error}</p>}

        <div className="mb-4 flex items-start gap-4">
          <div className="w-[74px] shrink-0" style={{ aspectRatio: "2/3" }}>
            <BookCover item={item} />
          </div>
          <div className="pt-0.5">
            <h1 className="font-serif text-xl font-semibold leading-tight">
              {item.title}
            </h1>
            {item.creator && (
              <p className="mt-0.5 text-sm text-ink/65">{item.creator}</p>
            )}
            <div className="mt-2">
              <StatusEditor itemId={item.id} status={item.status} />
            </div>
          </div>
        </div>

        <section className="mb-4 rounded-md border-2 border-cover-border bg-white px-3 py-3">
          <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-ink/60">
            Sua nota
          </h2>
          <RatingStars itemId={item.id} initialStars={myRating?.stars ?? 0} />
        </section>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">
              {formatDuration(stats.totalSeconds)}
            </div>
            <div className="text-[10.5px] text-ink/65">tempo total</div>
          </div>
          <div className="rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">
              {stats.pagesPerDay}
            </div>
            <div className="text-[10.5px] text-ink/65">pág. / dia</div>
          </div>
          <div className="rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">
              {stats.pagesPerHour}
            </div>
            <div className="text-[10.5px] text-ink/65">pág. / hora</div>
          </div>
          <div className="rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">
              {stats.daysRead}
            </div>
            <div className="text-[10.5px] text-ink/65">dias lidos</div>
          </div>
        </div>

        {prediction && (
          <div className="mb-4 rounded-md border-2 border-moss-dark bg-moss-dark/10 px-3 py-2.5 text-sm">
            Nesse ritmo, você termina em{" "}
            <strong>~{prediction.daysRemaining} dias</strong> (
            {prediction.dateLabel}).
          </div>
        )}

        {embedUrl && (
          <iframe
            src={embedUrl}
            width="100%"
            height="152"
            style={{ borderRadius: 12, marginBottom: "1rem" }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium">Comentários</h2>
          <div className="mb-3 flex flex-col gap-2">
            {(comments ?? []).map((c) => (
              <div
                key={c.id}
                className="rounded-md border-2 border-cover-border px-3 py-2 text-sm"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10.5px] text-ink/55">
                  {c.scope === "chapter" && c.chapter_ref != null && (
                    <span className="rounded-full border border-cover-border bg-paper px-2 py-0.5">
                      cap. {c.chapter_ref}
                    </span>
                  )}
                  <span aria-label={c.is_public ? "visível para amigos" : "só você"}>
                    {c.is_public ? "🌍" : "🔒"}
                  </span>
                </div>
                {c.content && <p>{c.content}</p>}
                {c.gif_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- GIF externo do Giphy
                  <img
                    src={c.gif_url}
                    alt="GIF"
                    className="mt-1.5 max-h-32 rounded border-2 border-cover-border"
                  />
                )}
              </div>
            ))}
          </div>
          <CommentComposer itemId={item.id} />
        </section>
      </main>
    </>
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

// Visão de um livro que pertence a um amigo: só leitura (status + nota + comentários
// públicos do dono) + "Indicar para alguém". Sem trava de spoiler (cortada).
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
      supabase.from("profiles").select("display_name").eq("id", item.user_id).maybeSingle(),
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

  const ownerName = owner?.display_name ?? "amigo";

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/estante?view=amigos" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">estante de {ownerName}</span>
      </header>

      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        <div className="mb-4 flex items-start gap-4">
          <div className="w-[74px] shrink-0" style={{ aspectRatio: "2/3" }}>
            <BookCover item={item} />
          </div>
          <div className="pt-0.5">
            <h1 className="font-serif text-xl font-semibold leading-tight">
              {item.title}
            </h1>
            {item.creator && (
              <p className="mt-0.5 text-sm text-ink/65">{item.creator}</p>
            )}
            <span className="mt-2 inline-block rounded-full border-2 border-ink bg-white px-3 py-0.5 text-xs font-medium">
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
            <div className="mt-2">
              {ownerRating?.stars ? (
                <StarsStatic stars={ownerRating.stars} />
              ) : (
                <span className="text-xs text-ink/55">sem nota ainda</span>
              )}
            </div>
          </div>
        </div>

        <section className="mb-5">
          <h2 className="mb-2 text-sm font-medium">Comentários de {ownerName}</h2>
          {comments && comments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border-2 border-cover-border bg-white px-3 py-2 text-sm"
                >
                  {c.scope === "chapter" && c.chapter_ref != null && (
                    <span className="mr-1 rounded-full border border-cover-border bg-paper px-2 py-0.5 text-[10.5px] text-ink/60">
                      cap. {c.chapter_ref}
                    </span>
                  )}
                  {c.content}
                  {c.gif_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- GIF externo do Giphy
                    <img
                      src={c.gif_url}
                      alt="GIF"
                      className="mt-1.5 max-h-32 rounded border-2 border-cover-border"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/55">Nenhum comentário público ainda.</p>
          )}
        </section>

        <RecommendButton friends={friends} itemRef={item.id} title={item.title} />
      </main>
    </>
  );
}
