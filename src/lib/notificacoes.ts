import type { SupabaseClient } from "@supabase/supabase-js";
import { getPedidosRecebidos } from "@/lib/friends";
import { getReceivedRecommendations } from "@/lib/recommendations";

export type TipoNotificacao = "amizade" | "desafio" | "indicacao";

export type Notificacao = {
  id: string;
  tipo: TipoNotificacao;
  quando: string;
  /** Ordenação — a tela só mostra o texto relativo. */
  emMs: number;
  autor?: string;
  autorId?: string;
  avatarUrl?: string | null;
  avatarBg?: string;
  desafioId?: string;
  desafioNome?: string;
  comecaEm?: string | null;
  recId?: string;
  livroTitulo?: string;
  itemRef?: string | null;
  recado?: string | null;
};

/** "há 2h", "ontem" — o mesmo vocabulário que o resto do app usa. */
function quandoRelativo(iso: string): { texto: string; ms: number } {
  const ms = Date.parse(iso);
  const minutos = Math.floor((Date.now() - ms) / 60_000);
  if (minutos < 1) return { texto: "agora mesmo", ms };
  if (minutos < 60) return { texto: `há ${minutos} min`, ms };
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return { texto: `há ${horas}h`, ms };
  const dias = Math.floor(horas / 24);
  if (dias === 1) return { texto: "ontem", ms };
  return { texto: `há ${dias} dias`, ms };
}

/**
 * As notificações do Quill, montadas do que já existe no banco.
 *
 * Não há tabela de notificação: cada tipo é uma leitura de onde o fato mora —
 * pedido de amizade em `friendships`, indicação em `recommendations`, desafio
 * em `groups`. Criar uma tabela espelho significaria manter duas verdades em
 * sincronia, e o volume aqui não justifica.
 *
 * O custo disso é não haver "lida": o que resolve a notificação é responder a
 * ela. Aceitar o pedido tira o item da lista porque a amizade deixou de estar
 * pendente — não porque alguém marcou um booleano.
 */
export async function getNotificacoes(
  supabase: SupabaseClient,
  userId: string,
): Promise<Notificacao[]> {
  const hoje = new Date().toISOString().slice(0, 10);
  const daquiA7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const [pedidos, recs, { data: membros }] = await Promise.all([
    getPedidosRecebidos(supabase, userId),
    getReceivedRecommendations(supabase, userId),
    supabase
      .from("group_members")
      .select("groups!inner(id, name, starts_at, format)")
      .eq("user_id", userId),
  ]);

  const notas: Notificacao[] = [];

  for (const p of pedidos) {
    notas.push({
      id: `amizade-${p.id}`,
      tipo: "amizade",
      // `friendships` não guarda quando o pedido chegou de forma acessível
      // aqui; o texto some e a ordenação joga esses pro topo, que é onde uma
      // resposta pendente deve mesmo estar.
      quando: "aguardando resposta",
      emMs: Number.MAX_SAFE_INTEGER,
      autor: p.nome,
      autorId: p.id,
      avatarUrl: p.avatarUrl,
      avatarBg: p.avatarBg,
    });
  }

  for (const r of recs) {
    const { texto, ms } = quandoRelativo(new Date().toISOString());
    notas.push({
      id: `indicacao-${r.id}`,
      tipo: "indicacao",
      quando: texto,
      emMs: ms,
      autor: r.fromName,
      recId: r.id,
      livroTitulo: r.title,
      itemRef: r.itemRef,
      recado: r.message,
    });
  }

  type GrupoRow = { id: string; name: string; starts_at: string | null; format: string };
  for (const m of (membros ?? []) as unknown as { groups: GrupoRow }[]) {
    const g = m.groups;
    // Só desafio prestes a começar ou recém-começado: um que já rola há um mês
    // não é notícia.
    if (!g || g.format !== "challenge" || !g.starts_at) continue;
    if (g.starts_at < hoje || g.starts_at > daquiA7) continue;
    notas.push({
      id: `desafio-${g.id}`,
      tipo: "desafio",
      quando: g.starts_at === hoje ? "começa hoje" : `começa em ${g.starts_at.slice(8, 10)}/${g.starts_at.slice(5, 7)}`,
      emMs: Date.parse(`${g.starts_at}T00:00:00`),
      desafioId: g.id,
      desafioNome: g.name,
      comecaEm: g.starts_at,
    });
  }

  return notas.sort((a, b) => b.emMs - a.emMs);
}
