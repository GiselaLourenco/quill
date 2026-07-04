import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { ManualEntryForm } from "@/components/manual-entry-form";

export default async function ManualEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUserId();
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: books } = await supabase
    .from("media_items")
    .select("id, title")
    .order("title", { ascending: true });

  return <ManualEntryForm books={books ?? []} serverError={error} />;
}
