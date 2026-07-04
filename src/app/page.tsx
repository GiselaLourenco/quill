import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { SiteHeader } from "@/components/site-header";
import { BookCover } from "@/components/book-cover";

const STATUS_BAR: Record<string, string> = {
  want: "h-[5px] border-[1.5px] border-ink bg-transparent",
  reading: "h-[3px] bg-moss",
  finished: "h-[3px] bg-navy",
  abandoned: "h-[3px] bg-coral",
};

const STATUS_LABEL: Record<string, string> = {
  want: "quero ler",
  reading: "lendo",
  finished: "terminei",
  abandoned: "abandonei",
};

export default async function Home() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  const { data: items } = await supabase
    .from("media_items")
    .select("id, title, cover_kind, cover_url, cover_palette, status")
    .order("created_at", { ascending: false });

  return (
    <>
      <SiteHeader displayName={profile?.display_name ?? null} />
      <main className="relative flex-1 px-4 pb-24 pt-6">
        {items && items.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/books/${item.id}`}
                className="flex flex-col items-center gap-1.5"
                aria-label={`${item.title} — ${STATUS_LABEL[item.status] ?? item.status}`}
              >
                <div className="aspect-[2/3] w-full">
                  <BookCover item={item} />
                </div>
                <span className="w-full text-center text-xs font-medium leading-tight">
                  {item.title}
                </span>
                <span
                  className={`w-6 rounded-full ${STATUS_BAR[item.status] ?? "h-[3px] bg-ink/30"}`}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <h1 className="font-serif text-2xl">Sua estante está vazia</h1>
            <p className="text-ink/70">
              Adicione o primeiro livro que você está lendo (ou já leu).
            </p>
            <Link
              href="/books/new"
              className="mt-2 rounded-md border-2 border-ink bg-moss-dark px-4 py-2 font-display text-sm text-paper shadow-hard-sm"
            >
              Adicionar livro
            </Link>
          </div>
        )}

        <Link
          href="/books/new"
          aria-label="Adicionar livro"
          className="fixed bottom-6 right-6 flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-ink bg-moss-dark text-2xl text-paper shadow-hard"
        >
          +
        </Link>
      </main>
    </>
  );
}
