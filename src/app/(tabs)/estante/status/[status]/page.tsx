import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { BookCoverLovable } from "@/components/book-cover-lovable";
import { StarRating } from "@/components/star-rating";
import type { DbStatus } from "@/components/estante-shelf";

const PARAM_TO_DB: Record<string, DbStatus> = {
  lendo: "reading",
  quero_ler: "want",
  terminei: "finished",
  abandonei: "abandoned",
  recomendado: "recomendado",
};

const STATUS_META: Record<DbStatus, { label: string; corBg: string }> = {
  reading: { label: "Lendo", corBg: "bg-moss" },
  want: { label: "Quero ler", corBg: "bg-mustard" },
  finished: { label: "Terminei", corBg: "bg-navy" },
  abandoned: { label: "Abandonei", corBg: "bg-coral" },
  recomendado: { label: "Recomendado", corBg: "bg-cover-2" },
};

function paletteClass(n: number): "cover-1" | "cover-2" | "cover-3" | "cover-4" {
  return (`cover-${[1, 2, 3, 4].includes(n) ? n : 1}`) as "cover-1";
}

export default async function StatusGridPage({
  params,
}: {
  params: Promise<{ status: string }>;
}) {
  const { status } = await params;
  const userId = await requireUserId();
  const supabase = await createClient();

  const dbStatus = PARAM_TO_DB[status] ?? "reading";
  const meta = STATUS_META[dbStatus];

  const { data: items } = await supabase
    .from("media_items")
    .select("id, title, creator, cover_kind, cover_url, cover_palette")
    .eq("user_id", userId)
    .eq("status", dbStatus)
    .order("created_at", { ascending: false });

  const itemIds = (items ?? []).map((i) => i.id as string);
  const { data: ratings } = itemIds.length
    ? await supabase.from("ratings").select("item_id, stars").in("item_id", itemIds)
    : { data: [] };

  const starsByItem = new Map((ratings ?? []).map((r) => [r.item_id as string, r.stars as number]));

  const books = (items ?? []).map((item) => ({
    id: item.id as string,
    titulo: item.title as string,
    autor: (item.creator as string) ?? "",
    cover_kind: (item.cover_kind as "real" | "illustrated") ?? "illustrated",
    cover_url: (item.cover_url as string | null) ?? undefined,
    cover_palette: paletteClass(item.cover_palette as number),
    status: dbStatus as "lendo",
    nota: starsByItem.get(item.id as string),
    atualizadoEm: "",
  }));

  return (
    <div className="flex flex-1 flex-col bg-paper">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-paper px-3 py-3">
        <Link
          href="/estante"
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-paper shadow-hard-sm text-lg font-bold leading-none"
        >
          ‹
        </Link>
        <span className={`h-3 w-3 rounded-sm border border-ink ${meta.corBg}`} />
        <h1 className="font-display text-lg text-ink">{meta.label}</h1>
        <span className="text-xs text-ink-soft">· {books.length}</span>
      </header>

      {books.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-ink-soft">
          Nada em {meta.label.toLowerCase()} ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-4 px-4 py-4">
          {books.map((livro) => (
            <li key={livro.id} className="flex flex-col gap-1">
              <Link href={`/books/${livro.id}`}>
                <BookCoverLovable livro={livro} size="md" />
              </Link>
              {livro.nota != null && (
                <div className="flex justify-center">
                  <StarRating value={livro.nota} size="sm" />
                </div>
              )}
              <p className="line-clamp-2 text-[10px] font-semibold text-ink">{livro.titulo}</p>
              <p className="line-clamp-1 text-[9px] text-ink-soft">{livro.autor}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
