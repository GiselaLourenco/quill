import type { SupabaseClient } from "@supabase/supabase-js";
import { acaoDaChave, carregarInteracoes, parChave, SEM_INTERACOES } from "@/lib/interacoes";
import { nomeExibicao } from "@/lib/nome-exibicao";
import { ConversaSheet } from "@/components/conversa-sheet";

/**
 * "Conversa" de uma atualização na página do livro — onde o sino leva o dono
 * ("Maria curtiu que você terminou Circe") e quem chegou por um cartão que já
 * saiu do feed. Abre por cima da página (`?conversa=<chave>`).
 */
export async function ConversaAtualizacao({
  supabase,
  userId,
  itemId,
  donoId,
  titulo,
  chave,
}: {
  supabase: SupabaseClient;
  userId: string;
  itemId: string;
  donoId: string;
  titulo: string;
  chave: string;
}) {
  const [interacoes, { data: dono }] = await Promise.all([
    carregarInteracoes(supabase, userId, [{ itemId, chave }]),
    supabase.from("profiles").select("display_name, username").eq("id", donoId).maybeSingle(),
  ]);
  const quem =
    donoId === userId
      ? "Você"
      : nomeExibicao((dono?.display_name as string | null) ?? null, (dono?.username as string | null) ?? null);

  return (
    <ConversaSheet
      itemId={itemId}
      chave={chave}
      frase={`${quem} ${acaoDaChave(chave)} ${titulo}`}
      inicial={interacoes.get(parChave(itemId, chave)) ?? SEM_INTERACOES}
    />
  );
}
