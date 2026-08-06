import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { BookCover } from "@/components/book-cover";
import { EstanteShelf, type ShelfBook, type DbStatus } from "@/components/estante-shelf";
import { RecommendationsStrip } from "@/components/recommendations-strip";
import { getFriendsShelf } from "@/lib/friends";
import { getReceivedRecommendations } from "@/lib/recommendations";

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
    <>
      {/* Cabeçalho estilo Lovable: toggle Minha/Amigos + ações (diário, adicionar) */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b-2 border-ink bg-paper px-4 py-3">
        <div
          role="tablist"
          aria-label="Alternar entre minha estante e amigos"
          className="inline-flex rounded-full border-2 border-ink bg-paper p-0.5 shadow-hard-sm"
        >
          <Link
            role="tab"
            aria-selected={!isFriends}
            href="/estante"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              !isFriends ? "bg-navy text-paper" : "text-ink-soft"
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
              href="/estante?view=diario"
              aria-label="Abrir diário"
              aria-current={isDiary ? "page" : undefined}
              className={`flex h-10 w-10 items-center justify-center rounded-md border-2 border-ink shadow-hard-sm ${
                isDiary ? "bg-ink text-paper" : "bg-mustard text-ink"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </Link>
            <Link
              href="/books/new"
              aria-label="Adicionar livro"
              className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-ink bg-coral text-paper shadow-hard-sm"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 6v12M6 12h12" />
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
        <MyShelf supabase={supabase} />
      )}
    </>
  );
}

const DAY_FMT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

// "Meu diário": linha do tempo dos meus comentários (livro/capítulo), privados
// por padrão. comments.item_id tem FK direta pra media_items, então dá pra
// embutir o título no mesmo select.
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
    .eq("user_id", userId) // RLS deixa ler comentários públicos de outros; o diário é só meu
    .in("scope", ["item", "chapter"])
    .not("content", "is", null)
    .order("created_at", { ascending: false });

  if (!entries || entries.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center gap-3 px-6 py-16 text-center">
        <h1 className="font-serif text-2xl">Seu diário está vazio</h1>
        <p className="max-w-[240px] text-ink/70">
          Anote uma frase ou ideia ao terminar uma sessão de leitura — aparece
          aqui, só pra você.
        </p>
      </main>
    );
  }

  // agrupa por dia (chave = data local)
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
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const [{ data: items }, { data: ratings }] = await Promise.all([
    supabase
      .from("media_items")
      .select("id, title, creator, cover_kind, cover_url, cover_palette, status")
      .order("created_at", { ascending: false }),
    // RLS já limita `ratings` às notas do próprio usuário.
    supabase.from("ratings").select("item_id, stars"),
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
  const [shelves, recs] = await Promise.all([
    getFriendsShelf(supabase, userId),
    getReceivedRecommendations(supabase, userId),
  ]);

  if (shelves.length === 0 && recs.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center gap-3 px-6 py-16 text-center">
        <h1 className="font-serif text-2xl">Nenhum amigo por aqui ainda</h1>
        <p className="max-w-[240px] text-ink/70">
          Entre num desafio pelo código de convite — quem participa junto vira
          seu amigo e aparece aqui.
        </p>
        <Link
          href="/juntos"
          className="mt-2 rounded-md border-2 border-ink bg-moss-dark px-4 py-2 font-display text-sm text-paper shadow-hard-sm"
        >
          Ver desafios
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 pb-6 pt-4">
      <RecommendationsStrip recs={recs} />
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
                  <div className="w-[38px] shrink-0" style={{ aspectRatio: "2/3" }}>
                    <BookCover item={it} />
                  </div>
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
