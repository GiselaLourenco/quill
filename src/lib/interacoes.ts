import type { SupabaseClient } from "@supabase/supabase-js";
import type { Atividade } from "@/lib/friends";
import { nomeExibicao } from "@/lib/nome-exibicao";

/**
 * Curtir e comentar no feed dos amigos acontecem POR ATUALIZAÇÃO, não por
 * livro: "terminou Mistborn" e "deu ★★★★★ pra Mistborn" são conversas
 * diferentes. A chave junta o tipo com o instante em que aconteceu — se o
 * amigo muda o status de novo, nasce outra atualização, com conversa própria.
 * Tabela: `interacoes_feed` (scripts/2026-11-04-interacoes-feed.sql).
 */
export function chaveAtualizacao(a: Atividade): string {
  const tipo = a.tipo === "status" ? `status-${a.noCadastro ? "cadastro" : a.status}` : a.tipo;
  return `${tipo}@${a.em}`;
}

/** "terminou", "deu nota pra"… — pro sino e pro bloco "Conversa" do livro. */
export function acaoDaChave(chave: string): string {
  const tipo = chave.split("@")[0] ?? "";
  switch (tipo) {
    case "status-finished":
      return "terminou";
    case "status-reading":
      return "começou a ler";
    case "status-want":
      return "quis ler";
    case "status-abandoned":
      return "abandonou";
    case "status-platinum":
      return "platinou";
    case "status-cadastro":
      return "adicionou à estante";
    case "nota":
      return "deu nota pra";
    case "comentario":
      return "comentou";
    case "leitura":
      return "leu";
    default:
      return "atualizou";
  }
}

export type ComentarioFeed = {
  id: string;
  nome: string;
  texto: string | null;
  gifUrl: string | null;
  quando: string;
  /** Seu comentário — aparece como "Você". */
  meu?: boolean;
};

export type InteracoesCartao = {
  curtidas: number;
  euCurti: boolean;
  comentarios: ComentarioFeed[];
};

export const SEM_INTERACOES: InteracoesCartao = { curtidas: 0, euCurti: false, comentarios: [] };

export const parChave = (itemId: string, chave: string) => `${itemId}|${chave}`;

function quandoCurto(iso: string): string {
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/**
 * Curtidas e comentários de várias atualizações de uma vez (feed inteiro).
 * Sem a tabela (migração não aplicada) devolve vazio — o feed segue de pé.
 */
export async function carregarInteracoes(
  supabase: SupabaseClient,
  userId: string,
  pares: { itemId: string; chave: string }[],
): Promise<Map<string, InteracoesCartao>> {
  const mapa = new Map<string, InteracoesCartao>();
  if (pares.length === 0) return mapa;

  const chaves = new Set(pares.map((p) => parChave(p.itemId, p.chave)));
  const { data, error } = await supabase
    .from("interacoes_feed")
    .select("id, item_id, atualizacao, user_id, tipo, content, gif_url, created_at")
    .in("item_id", Array.from(new Set(pares.map((p) => p.itemId))))
    .order("created_at", { ascending: true });
  if (error || !data) return mapa;

  const linhas = data.filter((r) => chaves.has(parChave(r.item_id as string, r.atualizacao as string)));
  const autores = Array.from(new Set(linhas.filter((r) => r.tipo === "comentario").map((r) => r.user_id as string)));
  const { data: perfis } = autores.length
    ? await supabase.from("profiles").select("id, display_name, username").in("id", autores)
    : { data: [] };
  const nomePorId = new Map(
    (perfis ?? []).map((p) => [
      p.id as string,
      nomeExibicao(p.display_name as string | null, p.username as string | null),
    ]),
  );

  for (const r of linhas) {
    const k = parChave(r.item_id as string, r.atualizacao as string);
    const atual = mapa.get(k) ?? { curtidas: 0, euCurti: false, comentarios: [] };
    if (r.tipo === "curtida") {
      atual.curtidas += 1;
      if (r.user_id === userId) atual.euCurti = true;
    } else {
      const meu = r.user_id === userId;
      atual.comentarios.push({
        id: r.id as string,
        nome: meu ? "Você" : (nomePorId.get(r.user_id as string) ?? "amigo"),
        texto: (r.content as string | null) ?? null,
        gifUrl: (r.gif_url as string | null) ?? null,
        quando: quandoCurto(r.created_at as string),
        meu,
      });
    }
    mapa.set(k, atual);
  }
  return mapa;
}
