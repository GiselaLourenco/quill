import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { BookThumb } from "@/components/book-thumb";
import { EstanteShelf, type ShelfBook, type DbStatus } from "@/components/estante-shelf";
import { RecommendationsStrip } from "@/components/recommendations-strip";
import { getFriendsShelf, getFriends } from "@/lib/friends";
import { getReceivedRecommendations } from "@/lib/recommendations";
import { IndicarSheet, type LivroIndicavel } from "@/components/indicar-sheet";
import { EmptyState } from "@/components/empty-state";

const STATUS_LABEL: Record<string, string> = {
  want: "quero ler",
  reading: "lendo",
  finished: "terminei",
  recomendado: "recomendado",
  abandoned: "abandonei",
};

function Stars({ stars }: { stars: number }) {
  return (
    <span aria-label={`${stars} de 5 estrelas`} className="text-xs tracking-tight">
      <span className="text-mustard">{"★".repeat(stars)}</span>
      <span className="text-ink/25">{"★".repeat(5 - stars)}</span>
    </span>
  );
}

export default async function EstantePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const userId = await requireUserId();
  const { view } = await searchParams;
  const isFriends = view === "amigos";
  const isDiary = view === "diario";

  const supabase = await createClient();

  return (
    <div className="flex flex-1 flex-col bg-paper">
      {/* Cabeçalho: toggle Minha/Amigos + diário. Adicionar livro virou botão
          flutuante no canto inferior direito (BotaoAdicionarLivro). */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b-2 border-ink bg-paper px-4 py-3">
        <div
          role="tablist"
          aria-label="Alternar entre minha estante e amigos"
          className="inline-flex rounded-full border-2 border-ink bg-paper p-0.5 shadow-hard-sm"
        >
          <Link
            role="tab"
            aria-selected={!isFriends && !isDiary}
            href="/estante"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              !isFriends && !isDiary ? "bg-navy text-paper" : "text-ink-soft"
            }`}
          >
            Minha
          </Link>
          <Link
            role="tab"
            aria-selected={isFriends}
            href="/estante?view=amigos"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isFriends ? "bg-navy text-paper" : "text-ink-soft"
            }`}
          >
            Amigos
          </Link>
        </div>

        {!isFriends && (
          <div className="flex items-center gap-2">
            <Link
              href="/estante/diario"
              aria-label="Abrir diário"
              className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-ink bg-mustard text-ink shadow-hard-sm"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </Link>
          </div>
        )}
      </header>

      {isFriends ? (
        <FriendsShelf supabase={supabase} userId={userId} />
      ) : isDiary ? (
        <MyDiary supabase={supabase} userId={userId} />
      ) : (
        <MyShelf supabase={supabase} userId={userId} />
      )}
    </div>
  );
}

const DAY_FMT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

async function MyDiary({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  const { data: entries } = await supabase
    .from("comments")
    .select("id, content, chapter_ref, scope, is_public, created_at, item:media_items(title)")
    .eq("user_id", userId)
    .in("scope", ["item", "chapter"])
    .not("content", "is", null)
    .order("created_at", { ascending: false });

  if (!entries || entries.length === 0) {
    return (
      <main className="flex flex-1 flex-col">
        <EmptyState
          mascote="escrevendo"
          titulo="Seu diário está vazio"
          texto="Anote uma frase ou uma ideia ao terminar uma sessão de leitura — aparece aqui, só pra você."
          acao={{ href: "/ler", label: "Registrar leitura" }}
        />
      </main>
    );
  }

  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = DAY_FMT.format(new Date(e.created_at));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  return (
    <main className="flex-1 px-4 pb-6 pt-4">
      <div className="flex flex-col gap-4">
        {[...groups.entries()].map(([day, dayEntries]) => (
          <section key={day}>
            <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
              {day}
            </h2>
            <div className="flex flex-col gap-2">
              {dayEntries.map((e) => {
                const item = Array.isArray(e.item) ? e.item[0] : e.item;
                return (
                  <div
                    key={e.id}
                    className="rounded-md border-2 border-cover-border bg-white px-3 py-2"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] text-ink/55">
                      <span className="truncate">
                        {item?.title ?? "livro"}
                        {e.scope === "chapter" && e.chapter_ref != null
                          ? ` · cap. ${e.chapter_ref}`
                          : ""}
                      </span>
                      <span aria-label={e.is_public ? "visível para amigos" : "só você"}>
                        {e.is_public ? "🌍" : "🔒"}
                      </span>
                    </div>
                    <p className="text-sm">{e.content}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

async function MyShelf({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  // A RLS deixa amigo ler meus livros (e vice-versa) — por isso a estante
  // PRECISA filtrar pelo dono aqui. Sem isso, os livros do amigo apareciam
  // misturados aos meus.
  const [{ data: items }, { data: ratings }] = await Promise.all([
    supabase
      .from("media_items")
      .select("id, title, creator, cover_kind, cover_url, cover_palette, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("ratings").select("item_id, stars").eq("user_id", userId),
  ]);

  const starsByItem = new Map((ratings ?? []).map((r) => [r.item_id, r.stars]));

  const books: ShelfBook[] = (items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    creator: item.creator,
    cover_kind: item.cover_kind,
    cover_url: item.cover_url,
    cover_palette: item.cover_palette,
    status: item.status as DbStatus,
    stars: starsByItem.get(item.id) ?? 0,
  }));

  return <EstanteShelf books={books} />;
}

async function FriendsShelf({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  const [shelves, recs, amigos, { data: meusLivros }] = await Promise.all([
    getFriendsShelf(supabase, userId),
    getReceivedRecommendations(supabase, userId),
    getFriends(supabase, userId),
    supabase
      .from("media_items")
      .select("id, title, creator, cover_kind, cover_url, cover_palette")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const livrosIndicaveis: LivroIndicavel[] = (meusLivros ?? []).map((l) => ({
    id: l.id as string,
    title: (l.title as string) ?? "Sem título",
    creator: (l.creator as string | null) ?? null,
    cover_kind: l.cover_kind as string,
    cover_url: (l.cover_url as string | null) ?? null,
    cover_palette: (l.cover_palette as number) ?? 0,
  }));

  if (shelves.length === 0 && recs.length === 0) {
    return (
      <main className="flex flex-1 flex-col">
        <EmptyState
          mascote="confiante"
          titulo="Sem estantes de amigos ainda"
          texto="Aqui você vê o que seus amigos estão lendo, com as notas e os comentários que eles deixaram públicos. Assim que alguém virar seu amigo, a estante dessa pessoa aparece nesta aba."
          acao={{ href: "/estante", label: "Ver minha estante" }}
        />
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 pb-6 pt-4">
      <RecommendationsStrip recs={recs} />

      {/* Indicar livro a um amigo */}
      <IndicarSheet livros={livrosIndicaveis} amigos={amigos} />

      <div className="flex flex-col gap-4">
        {shelves.map((shelf) => (
          <section key={shelf.friendId}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-mustard text-xs font-semibold uppercase">
                {shelf.name.charAt(0)}
              </span>
              <span className="text-sm font-semibold">{shelf.name}</span>
            </div>
            <div className="flex flex-col gap-2">
              {shelf.items.map((it) => (
                <Link
                  key={it.id}
                  href={`/books/${it.id}`}
                  className="flex gap-3 rounded-md border-2 border-cover-border bg-white p-2.5"
                >
                  <BookThumb item={it} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{it.title}</span>
                      <span className="shrink-0 text-[10.5px] text-ink/55">
                        {STATUS_LABEL[it.status] ?? it.status}
                        {it.progressLabel ? ` · ${it.progressLabel}` : ""}
                      </span>
                    </div>
                    {it.stars != null && (
                      <div className="mt-0.5">
                        <Stars stars={it.stars} />
                      </div>
                    )}
                    {it.lastComment && (
                      <p className="mt-1 rounded bg-paper px-2 py-1 text-[11.5px] text-ink/80">
                        {it.lastComment.chapterRef != null && (
                          <span className="text-ink/50">
                            cap. {it.lastComment.chapterRef} ·{" "}
                          </span>
                        )}
                        {it.lastComment.content}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
