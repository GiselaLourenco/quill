import type { SupabaseClient } from "@supabase/supabase-js";

export type ReceivedRec = {
  id: string;
  title: string;
  message: string | null;
  itemRef: string | null;
  fromName: string;
};

// Indicações pendentes recebidas pelo usuário, com o nome de quem indicou.
export async function getReceivedRecommendations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReceivedRec[]> {
  const { data: recs } = await supabase
    .from("recommendations")
    .select("id, title, message, item_ref, from_user_id, created_at")
    .eq("to_user_id", userId)
    .order("created_at", { ascending: false });

  if (!recs || recs.length === 0) return [];

  const fromIds = Array.from(
    new Set(recs.map((r) => r.from_user_id).filter(Boolean) as string[]),
  );
  const { data: profiles } = fromIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", fromIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? "amigo"]),
  );

  return recs.map((r) => ({
    id: r.id as string,
    title: (r.title as string) ?? "livro",
    message: (r.message as string) ?? null,
    itemRef: (r.item_ref as string) ?? null,
    fromName: r.from_user_id ? nameById.get(r.from_user_id) ?? "amigo" : "amigo",
  }));
}
