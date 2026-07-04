import type { SupabaseClient } from "@supabase/supabase-js";

// Bucket "highlights" é privado — geramos uma URL assinada por request em
// vez de expor uma URL pública fixa.
export async function getHighlightSignedUrl(
  supabase: SupabaseClient,
  path: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from("highlights")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
