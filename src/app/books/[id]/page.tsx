import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { BookCover } from "@/components/book-cover";
import { StatusEditor } from "@/components/status-editor";
import { AddHighlightForm } from "@/components/add-highlight-form";
import { createComment } from "@/app/actions/comments";
import { computeReadingStats, formatDuration } from "@/lib/reading-stats";
import { toSpotifyEmbedUrl } from "@/lib/spotify";
import { getHighlightSignedUrl } from "@/lib/highlights";

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
      "id, title, creator, status, cover_kind, cover_url, cover_palette, spotify_url",
    )
    .eq("id", id)
    .single();

  if (!item) notFound();

  const [{ data: sessions }, { data: highlights }, { data: comments }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("started_at, duration_seconds, unit_end")
        .eq("item_id", id),
      supabase
        .from("highlights")
        .select("id, image_url, unit_ref, note, created_at")
        .eq("item_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("comments")
        .select("id, content, created_at")
        .eq("item_id", id)
        .eq("scope", "item")
        .order("created_at", { ascending: true }),
    ]);

  const stats = computeReadingStats(sessions ?? []);
  const embedUrl = item.spotify_url ? toSpotifyEmbedUrl(item.spotify_url) : null;
  const highlightsWithUrls = await Promise.all(
    (highlights ?? []).map(async (h) => ({
      ...h,
      signedUrl: h.image_url ? await getHighlightSignedUrl(supabase, h.image_url) : null,
    })),
  );

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

        <div className="mb-4 flex gap-2">
          <div className="flex-1 rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">
              {formatDuration(stats.totalSeconds)}
            </div>
            <div className="text-[10.5px] text-ink/65">tempo total</div>
          </div>
          <div className="flex-1 rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">
              {stats.pagesPerDay}
            </div>
            <div className="text-[10.5px] text-ink/65">pág. / dia</div>
          </div>
          <div className="flex-1 rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">
              {stats.daysRead}
            </div>
            <div className="text-[10.5px] text-ink/65">dias lidos</div>
          </div>
        </div>

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

        <section className="mb-5">
          <h2 className="mb-2 text-sm font-medium">Trechos favoritos</h2>
          <div className="flex flex-wrap gap-2">
            {highlightsWithUrls.map((h) =>
              h.signedUrl ? (
                <a
                  key={h.id}
                  href={h.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-[52px] w-[52px] overflow-hidden rounded-md border-2 border-cover-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária, não vale otimizar */}
                  <img
                    src={h.signedUrl}
                    alt={h.note ?? `Trecho${h.unit_ref ? ` — página ${h.unit_ref}` : ""}`}
                    className="h-full w-full object-cover"
                  />
                </a>
              ) : null,
            )}
            <AddHighlightForm itemId={item.id} userId={userId} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium">Comentários</h2>
          <div className="mb-3 flex flex-col gap-2">
            {(comments ?? []).map((c) => (
              <div
                key={c.id}
                className="rounded-md border-2 border-cover-border px-3 py-2 text-sm"
              >
                {c.content}
              </div>
            ))}
          </div>
          <form action={createComment} className="flex gap-2">
            <input type="hidden" name="item_id" value={item.id} />
            <input
              name="content"
              required
              placeholder="Escrever um comentário"
              className="flex-1 rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
            />
            <button
              type="submit"
              className="rounded border-2 border-ink bg-moss-dark px-3 text-sm font-medium text-paper"
            >
              Enviar
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
