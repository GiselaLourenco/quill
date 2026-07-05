import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { FreeReadingSession } from "@/components/free-reading-session";
import { getActiveChallenges } from "@/lib/challenges";

export default async function LerPage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const [{ data: books }, activeChallenges] = await Promise.all([
    supabase.from("media_items").select("id, title").order("title", { ascending: true }),
    getActiveChallenges(supabase, userId),
  ]);

  return (
    <>
      <header className="border-b-2 border-ink bg-white px-4 py-3">
        <span className="font-serif text-lg">Ler</span>
      </header>
      <FreeReadingSession books={books ?? []} activeChallenges={activeChallenges} />
    </>
  );
}
