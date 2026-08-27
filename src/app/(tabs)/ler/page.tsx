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
    <div className="min-h-full">
      <FreeReadingSession
        books={books ?? []}
        activeChallenges={activeChallenges}
      />
    </div>
  );
}
