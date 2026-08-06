import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { ManualEntryForm } from "@/components/manual-entry-form";
import { getActiveChallenges } from "@/lib/challenges";

export default async function ManualEntryPage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const [{ data: books }, activeChallenges] = await Promise.all([
    supabase.from("media_items").select("id, title").order("title", { ascending: true }),
    getActiveChallenges(supabase, userId),
  ]);

  return (
    <ManualEntryForm
      books={books ?? []}
      activeChallenges={activeChallenges}
    />
  );
}
