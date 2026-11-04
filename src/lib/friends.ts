import type { SupabaseClient } from "@supabase/supabase-js";
import { nomeExibicao } from "@/lib/nome-exibicao";
import { paginasLidas, posicaoAtualPorItem, posicaoExibida } from "@/lib/reading-stats";
import {
  carregarInteracoes,
  chaveAtualizacao,
  parChave,
  SEM_INTERACOES,
  type InteracoesCartao,
} from "@/lib/interacoes";

export type Friend = { id: string; name: string };

// Amigos (amizade aceita) do usuário, com nome — para pickers e listas.
export async function getFriends(
  supabase: SupabaseClient,
  userId: string,
): Promise<Friend[]> {
  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted");

  const friendIds = Array.from(
    new Set(
      (friendships ?? []).map((f) =>
        f.user_id === userId ? f.friend_id : f.user_id,
      ),
    ),
  );
  if (friendIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", friendIds);

  return (profiles ?? [])
    .map((p) => ({
      id: p.id as string,
      name: nomeExibicao(p.display_name as string | null, p.username as string | null),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type FriendItem = {
  id: string;
  title: string;
  creator: string | null;
  cover_kind: string;
  cover_url: string | null;
  cover_palette: number;
  status: string;
  is_recommended: boolean;
  stars: number | null;
  progressLabel: string | null;
  percent_lido: number | null; // posição atual ÷ total (páginas ou capítulos) — mesmo cálculo da estante
  total_units: number | null; // páginas
  paginas_lidas: number; // pro somatório de "Páginas" quando a estante dele é exibida com EstanteShelf
  lastComment: { content: string; chapterRef: number | null } | null;
  /** O que o amigo fez de mais recente com o livro — ordena o feed. */
  atividade: Atividade;
  /** Identidade dessa atualização — curtir/comentar valem pra ela, não pro livro. */
  chave: string;
  interacoes: InteracoesCartao;
};

/**
 * Última atualização de um livro do amigo. `noCadastro` = o status é o mesmo
 * desde que o livro entrou na estante (vira "adicionou à estante").
 */
export type Atividade = { em: string } & (
  | { tipo: "status"; status: string; noCadastro: boolean }
  | { tipo: "nota"; estrelas: number }
  | { tipo: "comentario"; texto: string; capitulo: number | null }
  | { tipo: "leitura"; posicao: string | null }
);

type ItemRow = {
  id: string;
  user_id: string;
  title: string;
  creator: string | null;
  cover_kind: string;
  cover_url: string | null;
  cover_palette: number;
  status: string;
  is_recommended: boolean | null;
  created_at: string;
  status_changed_at?: string | null;
  total_units: number | null;
  total_chapters: number | null;
};

export type FriendShelf = {
  friendId: string;
  name: string;
  items: FriendItem[];
};

// Reúne a "Estante dos amigos": para cada amigo (amizade aceita), os livros
// dele com nota, progresso e o comentário público mais recente. As leituras
// de itens/sessões de amigos são liberadas pela RLS (are_friends).
export async function getFriendsShelf(
  supabase: SupabaseClient,
  userId: string,
): Promise<FriendShelf[]> {
  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted");

  const friendIds = Array.from(
    new Set(
      (friendships ?? []).map((f) =>
        f.user_id === userId ? f.friend_id : f.user_id,
      ),
    ),
  );
  if (friendIds.length === 0) return [];

  // Tabelas que só se ligam via auth.users não têm FK direta entre si —
  // buscamos separado e cruzamos em JS (gotcha conhecido do PostgREST).
  // `status_changed_at` e `ratings.updated_at` vêm da migração
  // scripts/2026-11-03-feed-atividade.sql. Sem ela a consulta falha e
  // repetimos sem essas colunas — o feed cai pra data de cadastro.
  const COLUNAS_ITEM =
    "id, user_id, title, creator, cover_kind, cover_url, cover_palette, status, is_recommended, created_at, total_units, total_chapters";
  const buscarItens = (colunas: string) =>
    supabase
      .from("media_items")
      .select(colunas)
      .in("user_id", friendIds)
      .order("created_at", { ascending: false })
      .returns<ItemRow[]>();
  const [{ data: profiles }, itensComData] = await Promise.all([
    supabase.from("profiles").select("id, display_name, username").in("id", friendIds),
    buscarItens(`${COLUNAS_ITEM}, status_changed_at`),
  ]);
  const items = itensComData.error
    ? (await buscarItens(COLUNAS_ITEM)).data
    : itensComData.data;

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      nomeExibicao(p.display_name as string | null, p.username as string | null),
    ]),
  );
  const itemRows = items ?? [];
  const itemIds = itemRows.map((it) => it.id);

  const [{ data: ratings }, { data: comments }, { data: sessions }] =
    itemIds.length
      ? await Promise.all([
          supabase
            .from("ratings")
            .select("item_id, stars, updated_at")
            .in("item_id", itemIds)
            .then(async (r) =>
              r.error
                ? await supabase.from("ratings").select("item_id, stars, created_at").in("item_id", itemIds)
                : r,
            ),
          supabase
            .from("comments")
            .select("item_id, content, chapter_ref, created_at")
            .in("item_id", itemIds)
            .eq("is_public", true)
            .in("scope", ["item", "chapter"])
            .order("created_at", { ascending: false }),
          supabase
            .from("sessions")
            .select("item_id, unit_end, chapter_end, created_at, cadastro")
            .in("item_id", itemIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const starsByItem = new Map(
    (ratings ?? []).map((r) => [r.item_id, r.stars as number]),
  );
  const ratedAtByItem = new Map(
    (ratings ?? []).map((r) => [
      r.item_id,
      ("updated_at" in r ? r.updated_at : r.created_at) as string,
    ]),
  );
  const lastCommentByItem = new Map<
    string,
    { content: string; chapterRef: number | null; createdAt: string }
  >();
  for (const c of comments ?? []) {
    if (!c.content) continue;
    if (!lastCommentByItem.has(c.item_id)) {
      lastCommentByItem.set(c.item_id, {
        content: c.content,
        chapterRef: c.chapter_ref ?? null,
        createdAt: c.created_at as string,
      });
    }
  }
  // Última sessão de leitura de verdade — posição informada no cadastro da
  // estante não é atividade (mesma regra das métricas).
  const lastReadByItem = new Map<
    string,
    { em: string; pagina: number | null; capitulo: number | null }
  >();
  for (const s of sessions ?? []) {
    if (s.cadastro) continue;
    const atual = lastReadByItem.get(s.item_id);
    if (!atual || s.created_at > atual.em) {
      lastReadByItem.set(s.item_id, {
        em: s.created_at as string,
        pagina: (s.unit_end as number | null) ?? null,
        capitulo: (s.chapter_end as number | null) ?? null,
      });
    }
  }
  const posicaoPorItem = posicaoAtualPorItem(
    (sessions ?? []).map((s) => ({
      item_id: s.item_id as string,
      unit_end: s.unit_end as number | null,
      chapter_end: s.chapter_end as number | null,
      created_at: s.created_at as string,
    })),
  );

  const shelfByFriend = new Map<string, FriendShelf>();
  for (const fid of friendIds) {
    shelfByFriend.set(fid, {
      friendId: fid,
      name: nameById.get(fid) ?? "amigo",
      items: [],
    });
  }

  for (const it of itemRows) {
    const pos = posicaoExibida(posicaoPorItem.get(it.id), it);
    const progress = { pages: pos.paginas, chapters: pos.capitulos };
    let progressLabel: string | null = null;
    let percentLido: number | null = null;
    if (it.status === "reading") {
      if (progress.chapters > 0) progressLabel = `cap. ${progress.chapters}`;
      else if (progress.pages > 0) progressLabel = `pág. ${progress.pages}`;
    }
    if (it.total_units && progress.pages > 0) {
      percentLido = Math.min(100, Math.round((progress.pages / it.total_units) * 100));
    } else if (it.total_chapters && progress.chapters > 0) {
      percentLido = Math.min(100, Math.round((progress.chapters / it.total_chapters) * 100));
    }
    shelfByFriend.get(it.user_id)?.items.push({
      id: it.id,
      title: it.title,
      creator: it.creator,
      cover_kind: it.cover_kind,
      cover_url: it.cover_url,
      cover_palette: it.cover_palette,
      status: it.status,
      is_recommended: !!it.is_recommended,
      stars: starsByItem.get(it.id) ?? null,
      progressLabel,
      percent_lido: percentLido,
      total_units: it.total_units,
      paginas_lidas: paginasLidas(it, posicaoPorItem.get(it.id)?.paginas),
      lastComment: lastCommentByItem.get(it.id) ?? null,
      ...(() => {
        const atividade = ultimaAtividade(it, {
          estrelas: starsByItem.get(it.id) ?? null,
          notaEm: ratedAtByItem.get(it.id) ?? null,
          comentario: lastCommentByItem.get(it.id) ?? null,
          leitura: lastReadByItem.get(it.id) ?? null,
        });
        return { atividade, chave: chaveAtualizacao(atividade), interacoes: SEM_INTERACOES };
      })(),
    });
  }

  // Curtidas e comentários de cada atualização (a que está no cartão).
  const todos = Array.from(shelfByFriend.values()).flatMap((sh) => sh.items);
  const interacoes = await carregarInteracoes(
    supabase,
    userId,
    todos.map((it) => ({ itemId: it.id, chave: it.chave })),
  );
  for (const it of todos) it.interacoes = interacoes.get(parChave(it.id, it.chave)) ?? SEM_INTERACOES;

  // só amigos com pelo menos um livro visível, ordem alfabética
  return Array.from(shelfByFriend.values())
    .filter((s) => s.items.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A mais recente entre mudança de status, nota, comentário público e leitura. */
function ultimaAtividade(
  it: { status: string; created_at: string; status_changed_at?: string | null },
  fontes: {
    estrelas: number | null;
    notaEm: string | null;
    comentario: { content: string; chapterRef: number | null; createdAt: string } | null;
    leitura: { em: string; pagina: number | null; capitulo: number | null } | null;
  },
): Atividade {
  const statusEm = it.status_changed_at ?? it.created_at;
  const candidatas: Atividade[] = [
    {
      tipo: "status",
      status: it.status,
      em: statusEm,
      // o trigger grava o created_at no insert; qualquer troca depois difere
      noCadastro: new Date(statusEm).getTime() - new Date(it.created_at).getTime() < 60_000,
    },
  ];
  if (fontes.estrelas && fontes.notaEm) {
    candidatas.push({ tipo: "nota", estrelas: fontes.estrelas, em: fontes.notaEm });
  }
  if (fontes.comentario) {
    candidatas.push({
      tipo: "comentario",
      texto: fontes.comentario.content,
      capitulo: fontes.comentario.chapterRef,
      em: fontes.comentario.createdAt,
    });
  }
  if (fontes.leitura) {
    const { pagina, capitulo } = fontes.leitura;
    candidatas.push({
      tipo: "leitura",
      posicao: capitulo ? `cap. ${capitulo}` : pagina ? `pág. ${pagina}` : null,
      em: fontes.leitura.em,
    });
  }
  return candidatas.reduce((a, b) =>
    new Date(b.em).getTime() > new Date(a.em).getTime() ? b : a,
  );
}

export type PedidoRecebido = {
  id: string;
  /** Quando o pedido chegou — as notificações ordenam e contam por isto. */
  criadoEm: string;
  nome: string;
  username: string | null;
  avatarUrl: string | null;
  avatarBg: string;
};

/** Quem pediu pra te adicionar e ainda está esperando resposta. */
export async function getPedidosRecebidos(
  supabase: SupabaseClient,
  userId: string,
): Promise<PedidoRecebido[]> {
  const { data: pedidos } = await supabase
    .from("friendships")
    .select("user_id, created_at")
    .eq("friend_id", userId)
    .eq("status", "pending");

  const ids = (pedidos ?? []).map((p) => p.user_id as string);
  const criadoPorId = new Map(
    (pedidos ?? []).map((p) => [p.user_id as string, p.created_at as string]),
  );
  if (ids.length === 0) return [];

  const { data: perfis } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, avatar_bg")
    .in("id", ids);

  return (perfis ?? []).map((p) => ({
    id: p.id as string,
    criadoEm: criadoPorId.get(p.id as string) ?? new Date(0).toISOString(),
    nome: nomeExibicao(p.display_name as string | null, p.username as string | null),
    username: (p.username as string | null) ?? null,
    avatarUrl: (p.avatar_url as string | null) ?? null,
    avatarBg: (p.avatar_bg as string | null) ?? "#6D6885",
  }));
}
