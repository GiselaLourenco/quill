import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { FreeReadingSession, type BookOption } from "@/components/free-reading-session";
import { getActiveChallenges } from "@/lib/challenges";

export default async function LerPage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const [{ data: books }, { data: positions }, activeChallenges] = await Promise.all([
    supabase
      .from("media_items")
      .select("id, title, creator, cover_kind, cover_url, cover_palette, status")
      .eq("user_id", userId)
      .in("status", ["reading", "want"])
      .order("created_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("item_id, unit_end")
      .eq("user_id", userId)
      .not("unit_end", "is", null)
      .not("item_id", "is", null),
    getActiveChallenges(supabase, userId),
  ]);

  // Posição atual de cada livro = maior unit_end registrado nas sessões.
  const paginaAtual = new Map<string, number>();
  for (const p of positions ?? []) {
    const atual = paginaAtual.get(p.item_id as string) ?? 0;
    if ((p.unit_end as number) > atual) paginaAtual.set(p.item_id as string, p.unit_end as number);
  }

  const bookOptions: BookOption[] = (books ?? []).map((b) => ({
    id: b.id as string,
    title: (b.title as string) ?? "Sem título",
    author: (b.creator as string | null) ?? "",
    cover_kind: (b.cover_kind as string) ?? "illustrated",
    cover_url: (b.cover_url as string | null) ?? null,
    cover_palette: (b.cover_palette as number) ?? 0,
    status: b.status as string,
    paginaAtual: paginaAtual.get(b.id as string) ?? null,
  }));

  return (
    <div className="min-h-full">
      <FreeReadingSession books={bookOptions} activeChallenges={activeChallenges} />
    </div>
  );
}
