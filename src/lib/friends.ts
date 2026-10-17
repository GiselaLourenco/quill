import type { SupabaseClient } from "@supabase/supabase-js";
import { nomeExibicao } from "@/lib/nome-exibicao";
import { posicaoAtualPorItem } from "@/lib/reading-stats";

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
  total_units: number | null; // páginas — pro somatório de "Páginas" quando a estante dele é exibida com EstanteShelf
  lastComment: { content: string; chapterRef: number | null } | null;
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
  const [{ data: profiles }, { data: items }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, username").in("id", friendIds),
    supabase
      .from("media_items")
      .select(
        "id, user_id, title, creator, cover_kind, cover_url, cover_palette, status, is_recommended, created_at, total_units, total_chapters",
      )
      .in("user_id", friendIds)
      .order("created_at", { ascending: false }),
  ]);

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
          supabase.from("ratings").select("item_id, stars").in("item_id", itemIds),
          supabase
            .from("comments")
            .select("item_id, content, chapter_ref, created_at")
            .in("item_id", itemIds)
            .eq("is_public", true)
            .in("scope", ["item", "chapter"])
            .order("created_at", { ascending: false }),
          supabase
            .from("sessions")
            .select("item_id, unit_end, chapter_end, created_at")
            .in("item_id", itemIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const starsByItem = new Map(
    (ratings ?? []).map((r) => [r.item_id, r.stars as number]),
  );
  const lastCommentByItem = new Map<
    string,
    { content: string; chapterRef: number | null }
  >();
  for (const c of comments ?? []) {
    if (!c.content) continue;
    if (!lastCommentByItem.has(c.item_id)) {
      lastCommentByItem.set(c.item_id, {
        content: c.content,
        chapterRef: c.chapter_ref ?? null,
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
  const progressByItem = new Map(
    [...posicaoPorItem.entries()].map(([id, pos]) => [
      id,
      { pages: pos.paginas, chapters: pos.capitulos },
    ]),
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
    const progress = progressByItem.get(it.id);
    let progressLabel: string | null = null;
    let percentLido: number | null = null;
    if (progress) {
      if (it.status === "reading") {
        if (progress.chapters > 0) progressLabel = `cap. ${progress.chapters}`;
        else if (progress.pages > 0) progressLabel = `pág. ${progress.pages}`;
      }
      if (it.total_units && progress.pages > 0) {
        percentLido = Math.min(100, Math.round((progress.pages / it.total_units) * 100));
      } else if (it.total_chapters && progress.chapters > 0) {
        percentLido = Math.min(100, Math.round((progress.chapters / it.total_chapters) * 100));
      }
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
      lastComment: lastCommentByItem.get(it.id) ?? null,
    });
  }

  // só amigos com pelo menos um livro visível, ordem alfabética
  return Array.from(shelfByFriend.values())
    .filter((s) => s.items.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
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
