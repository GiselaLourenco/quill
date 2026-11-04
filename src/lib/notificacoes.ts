import type { SupabaseClient } from "@supabase/supabase-js";
import { getPedidosRecebidos } from "@/lib/friends";
import { getReceivedRecommendations } from "@/lib/recommendations";
import { todayLocalDateKey, addDaysToKey } from "@/lib/date-br";
import { ACHIEVEMENTS_COM_AVATAR } from "@/lib/achievements";
import { srcDoAvatarDeConquista } from "@/lib/avatares";
import { acaoDaChave, parChave } from "@/lib/interacoes";
import { nomeExibicao } from "@/lib/nome-exibicao";

export type TipoNotificacao = "amizade" | "desafio" | "indicacao" | "conquista" | "feed";

export type Notificacao = {
  id: string;
  tipo: TipoNotificacao;
  quando: string;
  /** Ordenação — a tela só mostra o texto relativo. */
  emMs: number;
  /** Mais nova que a última limpeza. "Todas" mostra só estas. */
  nova: boolean;
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
  /** Conquista que liberou foto de perfil. */
  conquistaNome?: string;
  fotoSrc?: string;
  /** Feed: curtida ou comentário numa atualização — texto pronto e destino. */
  feedTipo?: "curtida" | "comentario";
  feedTexto?: string;
  feedTrecho?: string | null;
  feedHref?: string;
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
export type Notificacoes = {
  itens: Notificacao[];
  /** Quantas são mais novas que a última limpeza — é o número dos contadores. */
  novas: number;
};

export async function getNotificacoes(
  supabase: SupabaseClient,
  userId: string,
): Promise<Notificacoes> {
  const hoje = todayLocalDateKey();
  const daquiA7 = addDaysToKey(hoje, 7);

  const [pedidos, recs, { data: membros }, { data: perfil }, { data: conquistas }] = await Promise.all([
    getPedidosRecebidos(supabase, userId),
    getReceivedRecommendations(supabase, userId),
    supabase
      .from("group_members")
      .select("groups!inner(id, name, starts_at, format)")
      .eq("user_id", userId),
    supabase
      .from("profiles")
      .select("notificacoes_limpas_em")
      .eq("id", userId)
      .maybeSingle(),
    // Só as que dão foto viram notificação — a linha é gravada ao terminar o
    // livro (ver `registrarConquistaDeLivro`).
    supabase
      .from("user_achievements")
      .select("achievement_key, unlocked_at")
      .eq("user_id", userId)
      .in("achievement_key", ACHIEVEMENTS_COM_AVATAR.map((a) => a.key)),
  ]);

  const limpasEm = perfil?.notificacoes_limpas_em
    ? Date.parse(perfil.notificacoes_limpas_em as string)
    : 0;

  // Sem `nova` ainda: ela é decidida no fim, comparando com a última limpeza.
  const notas: Omit<Notificacao, "nova">[] = [];

  for (const p of pedidos) {
    const { texto, ms } = quandoRelativo(p.criadoEm);
    notas.push({
      id: `amizade-${p.id}`,
      tipo: "amizade",
      quando: texto,
      emMs: ms,
      autor: p.nome,
      autorId: p.id,
      avatarUrl: p.avatarUrl,
      avatarBg: p.avatarBg,
    });
  }

  for (const r of recs) {
    const { texto, ms } = quandoRelativo(r.criadoEm);
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

  for (const c of conquistas ?? []) {
    const a = ACHIEVEMENTS_COM_AVATAR.find((x) => x.key === c.achievement_key);
    if (!a) continue;
    const { texto, ms } = quandoRelativo(c.unlocked_at as string);
    notas.push({
      id: `conquista-${a.key}`,
      tipo: "conquista",
      quando: texto,
      emMs: ms,
      conquistaNome: a.name,
      fotoSrc: srcDoAvatarDeConquista(a.avatar.arquivo),
    });
  }

  notas.push(...(await notificacoesDoFeed(supabase, userId)));

  // Limpar não apaga nada: o pedido de amizade continua pendente e segue
  // visível nos filtros por tipo. O que ela faz é tirar da aba "Todas", que
  // passa a ser "o que chegou desde a última vez que você olhou".
  const itens = notas
    .map((n) => ({ ...n, nova: n.emMs > limpasEm }))
    .sort((a, b) => b.emMs - a.emMs);

  return { itens, novas: itens.filter((n) => n.nova).length };
}

/**
 * Curtidas e comentários no feed (tabela `interacoes_feed`). Avisa todo mundo
 * que interagiu com o cartão — o dono da atualização e quem já curtiu ou
 * comentou nele —, sempre sobre o que OUTROS fizeram, e agrupado por cartão:
 * "Maria e mais 2 curtiram". O dono vai pra Conversa na página do livro; quem
 * só participou vai pro cartão no feed dos amigos.
 */
async function notificacoesDoFeed(
  supabase: SupabaseClient,
  userId: string,
): Promise<Omit<Notificacao, "nova">[]> {
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
  type Linha = {
    item_id: string;
    dono_id: string;
    atualizacao: string;
    user_id: string;
    tipo: "curtida" | "comentario";
    content: string | null;
    created_at: string;
  };
  const campos = "item_id, dono_id, atualizacao, user_id, tipo, content, created_at";

  const [doDono, minhas] = await Promise.all([
    supabase.from("interacoes_feed").select(campos).eq("dono_id", userId).neq("user_id", userId).gte("created_at", desde),
    supabase.from("interacoes_feed").select("item_id, dono_id, atualizacao, created_at").eq("user_id", userId),
  ]);
  if (doDono.error || minhas.error) return []; // tabela ainda não existe

  // Cartões alheios em que eu interagi → desde quando (só avisa o que veio depois).
  const participeiDesde = new Map<string, string>();
  for (const m of minhas.data ?? []) {
    if (m.dono_id === userId) continue;
    const k = parChave(m.item_id as string, m.atualizacao as string);
    const atual = participeiDesde.get(k);
    if (!atual || (m.created_at as string) < atual) participeiDesde.set(k, m.created_at as string);
  }
  const itensParticipados = Array.from(new Set((minhas.data ?? []).filter((m) => m.dono_id !== userId).map((m) => m.item_id as string)));
  const { data: deOutros } = itensParticipados.length
    ? await supabase
        .from("interacoes_feed")
        .select(campos)
        .in("item_id", itensParticipados)
        .neq("user_id", userId)
        .gte("created_at", desde)
    : { data: [] };

  const linhas: (Linha & { papel: "dono" | "participante" })[] = [
    ...((doDono.data ?? []) as Linha[]).map((l) => ({ ...l, papel: "dono" as const })),
    ...((deOutros ?? []) as Linha[])
      .filter((l) => {
        const desdeK = participeiDesde.get(parChave(l.item_id, l.atualizacao));
        return l.dono_id !== userId && desdeK && l.created_at > desdeK;
      })
      .map((l) => ({ ...l, papel: "participante" as const })),
  ];
  if (linhas.length === 0) return [];

  const pessoas = Array.from(new Set(linhas.flatMap((l) => [l.user_id, l.dono_id])));
  const itens = Array.from(new Set(linhas.map((l) => l.item_id)));
  const [{ data: perfis }, { data: livros }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, username").in("id", pessoas),
    supabase.from("media_items").select("id, title").in("id", itens),
  ]);
  const nome = new Map(
    (perfis ?? []).map((p) => [p.id as string, nomeExibicao(p.display_name as string | null, p.username as string | null)]),
  );
  const titulo = new Map((livros ?? []).map((l) => [l.id as string, l.title as string]));

  // Um aviso por cartão + tipo (curtida / comentário).
  const grupos = new Map<string, (typeof linhas)[number][]>();
  for (const l of linhas) {
    if (!titulo.has(l.item_id)) continue; // livro sumiu ou deixou de ser visível
    const k = `${l.papel}|${l.tipo}|${parChave(l.item_id, l.atualizacao)}`;
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }

  const notas: Omit<Notificacao, "nova">[] = [];
  for (const [k, ls] of grupos) {
    ls.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const ultima = ls[0]!;
    const autores = Array.from(new Set(ls.map((l) => l.user_id)));
    const primeiro = nome.get(autores[0]!) ?? "Alguém";
    const plural = autores.length > 1;
    const quem = plural ? `${primeiro} e mais ${autores.length - 1}` : primeiro;
    const verbo = ultima.tipo === "curtida" ? (plural ? "curtiram" : "curtiu") : plural ? "comentaram" : "comentou";
    const sujeito = ultima.papel === "dono" ? "você" : (nome.get(ultima.dono_id) ?? "seu amigo");
    const { texto, ms } = quandoRelativo(ultima.created_at);
    notas.push({
      id: `feed-${k}`,
      tipo: "feed",
      quando: texto,
      emMs: ms,
      feedTipo: ultima.tipo,
      feedTexto: `${quem} ${verbo}: ${sujeito} ${acaoDaChave(ultima.atualizacao)} ${titulo.get(ultima.item_id)}`,
      feedTrecho: ultima.tipo === "comentario" ? ultima.content : null,
      feedHref:
        ultima.papel === "dono"
          ? `/books/${ultima.item_id}?conversa=${encodeURIComponent(ultima.atualizacao)}`
          : `/estante?view=amigos&foco=${encodeURIComponent(parChave(ultima.item_id, ultima.atualizacao))}`,
    });
  }
  return notas;
}
