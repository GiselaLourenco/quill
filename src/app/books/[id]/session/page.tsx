import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { ReadingSession } from "@/components/reading-session";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserId();
  const { id } = await params;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("media_items")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!item) notFound();

  return <ReadingSession itemId={item.id} title={item.title} />;
}
