"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { nomeExibicao } from "@/lib/nome-exibicao";

/** Em que pé está a relação com quem apareceu na busca. */
export type SituacaoAmizade =
  | "nenhuma"
  | "pedido-enviado"
  | "pedido-recebido"
  | "amigo"
  | "voce";

export type PessoaEncontrada = {
  id: string;
  nome: string;
  username: string | null;
  avatarUrl: string | null;
  avatarBg: string;
  situacao: SituacaoAmizade;
};

const MIN_BUSCA = 3;

/**
 * Procura gente por nome de usuário ou e-mail.
 *
 * Username casa por prefixo (é público e serve pra ser achado). E-mail só casa
 * inteiro, via `buscar_id_por_email` — busca parcial em e-mail viraria uma
 * varredura da base.
 */
export async function buscarPessoas(termo: string): Promise<PessoaEncontrada[]> {
  const meuId = await requireUserId();
  const limpo = termo.trim().toLowerCase();
  if (limpo.length < MIN_BUSCA) return [];

  const supabase = await createClient();

  let ids: string[] = [];
  if (limpo.includes("@")) {
    const { data } = await supabase.rpc("buscar_id_por_email", { p_email: limpo });
    if (data) ids = [data as string];
  } else {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `${limpo}%`)
      .limit(8);
    ids = (data ?? []).map((p) => p.id as string);
  }
  if (ids.length === 0) return [];

  const [{ data: perfis }, { data: relacoes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, avatar_bg")
      .in("id", ids),
    // A RLS já limita a linhas onde eu sou uma das pontas — é tudo que precisa
    // pra saber em que pé estou com cada pessoa da lista.
    supabase.from("friendships").select("user_id, friend_id, status"),
  ]);

  const situacaoDe = (outroId: string): SituacaoAmizade => {
    if (outroId === meuId) return "voce";
    const r = (relacoes ?? []).find(
      (f) =>
        (f.user_id === meuId && f.friend_id === outroId) ||
        (f.user_id === outroId && f.friend_id === meuId),
    );
    if (!r) return "nenhuma";
    if (r.status === "accepted") return "amigo";
    return r.user_id === meuId ? "pedido-enviado" : "pedido-recebido";
  };

  return (perfis ?? []).map((p) => ({
    id: p.id as string,
    nome: nomeExibicao(p.display_name as string | null, p.username as string | null),
    username: (p.username as string | null) ?? null,
    avatarUrl: (p.avatar_url as string | null) ?? null,
    avatarBg: (p.avatar_bg as string | null) ?? "#6D6885",
    situacao: situacaoDe(p.id as string),
  }));
}

export async function enviarPedido(paraId: string): Promise<{ error: string | null }> {
  const meuId = await requireUserId();
  if (paraId === meuId) return { error: "Não dá pra adicionar você mesmo." };

  const supabase = await createClient();

  // Se a outra pessoa já tinha pedido pra mim, aceitar é o que ela espera —
  // criar um segundo pedido em sentido contrário deixaria os dois esperando.
  const { data: existente } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status")
    .or(`and(user_id.eq.${meuId},friend_id.eq.${paraId}),and(user_id.eq.${paraId},friend_id.eq.${meuId})`)
    .maybeSingle();

  if (existente) {
    if (existente.status === "accepted") return { error: "Vocês já são amigos." };
    if (existente.user_id === meuId) return { error: "Pedido já enviado." };
    return aceitarPedido(paraId);
  }

  const { error } = await supabase
    .from("friendships")
    .insert({ user_id: meuId, friend_id: paraId, status: "pending" });

  if (error) return { error: "Não foi possível enviar o pedido." };
  revalidatePath("/profile");
  return { error: null };
}

export async function aceitarPedido(deId: string): Promise<{ error: string | null }> {
  const meuId = await requireUserId();
  const supabase = await createClient();

  // Uma linha só por amizade: aceitar é virar o status da linha de quem pediu.
  // `getFriends` já lê os dois sentidos, então não existe linha recíproca.
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("user_id", deId)
    .eq("friend_id", meuId)
    .eq("status", "pending");

  if (error) return { error: "Não foi possível aceitar." };
  revalidatePath("/profile");
  revalidatePath("/estante");
  return { error: null };
}

export async function recusarPedido(deId: string): Promise<{ error: string | null }> {
  const meuId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_id", deId)
    .eq("friend_id", meuId)
    .eq("status", "pending");

  if (error) return { error: "Não foi possível recusar." };
  revalidatePath("/profile");
  return { error: null };
}
