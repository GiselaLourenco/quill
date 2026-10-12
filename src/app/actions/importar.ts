"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserId } from "@/lib/supabase/auth";
import { ehAdmin } from "@/app/actions/admin";
import { paletteIndexForTitle } from "@/lib/covers";
import { buscarLivros, type LivroEncontrado } from "@/lib/open-library";
import { buscarLivrosGoogleBooks } from "@/lib/google-books";

export type LivroImportado = { title: string; creator: string | null };
export type UsuarioImportacao = { id: string; nome: string };

/** Um CSV da Amazon costuma ter centenas de linhas; o teto evita insert gigante. */
const MAXIMO = 500;

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Tira sufixos que a Amazon cola no título do export do Kindle — "(Portuguese
 * Edition)", "(Bright Falls Livro 1)" — que nunca aparecem no título real do
 * livro na Open Library. Sem isso a comparação exata abaixo falhava quase
 * sempre: numa importação real, 109 de 122 livros que ficaram sem capa tinham
 * um sufixo desses. Repete porque às vezes vêm dois grupos colados (série +
 * edição); errar pra mais aqui não tem risco — o pior caso é continuar sem
 * achar nada, igual a antes.
 */
function semSufixoDeEdicao(titulo: string): string {
  let t = titulo.trim();
  while (/\s*\([^()]*\)\s*$/.test(t)) {
    t = t.replace(/\s*\([^()]*\)\s*$/, "").trim();
  }
  return t || titulo;
}

/**
 * Só aceita o resultado se o título bater igualzinho (normalizado). Título
 * comum ("Sozinho", "Coragem") tem dezenas de livros diferentes na Open
 * Library — pegar o primeiro da lista arriscaria trazer capa/autor errados
 * pra estante de alguém. Melhor ficar sem capa do que com a capa trocada.
 */
function melhorCorrespondencia(
  titulo: string,
  autor: string | null,
  achados: LivroEncontrado[],
): LivroEncontrado | null {
  const alvo = normalizar(titulo);
  const candidatos = achados.filter((a) => normalizar(a.titulo) === alvo);
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1 || !autor) return candidatos[0]!;

  const alvoAutor = normalizar(autor);
  return (
    candidatos.find((c) => c.autor && normalizar(c.autor).includes(alvoAutor)) ?? candidatos[0]!
  );
}

/** Cada busca tem esse teto — mais curto que o da tela de cadastro (o lote não pode travar num só). */
const TIMEOUT_BUSCA_MS = 3500;
/** Buscas em paralelo: rápido o bastante sem parecer um ataque à Open Library. */
const CONCORRENCIA_BUSCA = 6;
/** A partir daqui para de iniciar buscas novas — o resto entra sem capa/páginas, como antes. */
const ORCAMENTO_BUSCA_MS = 6000;

/**
 * Tenta completar capa, autor e páginas — melhor esforço. Open Library
 * primeiro (não pede chave); sem achar nada lá, tenta o Google Books, que
 * cobre bem melhor ficção brasileira/traduzida contemporânea (romance, YA) —
 * o motivo de metade dos livros de uma importação real terem ficado sem capa
 * mesmo depois de tirar o sufixo "(Portuguese Edition)" do título.
 *
 * Um CSV grande (o caso de uso é a biblioteca Kindle inteira) não cabe numa
 * busca por livro dentro do tempo de uma function da Vercel: o lote inteiro
 * entra de qualquer jeito, só que os livros fora do orçamento de tempo ficam
 * sem essa informação (do jeito que já eram antes desta busca existir).
 */
async function enriquecerLivros(
  livros: LivroImportado[],
): Promise<Map<number, LivroEncontrado>> {
  const encontrados = new Map<number, LivroEncontrado>();
  const prazo = Date.now() + ORCAMENTO_BUSCA_MS;
  let proximo = 0;

  async function worker() {
    while (proximo < livros.length && Date.now() < prazo) {
      const i = proximo;
      proximo += 1;
      const livro = livros[i]!;
      const tituloBusca = semSufixoDeEdicao(livro.title);
      const termo = livro.creator ? `${tituloBusca} ${livro.creator}` : tituloBusca;

      const daOpenLibrary = await buscarLivros(termo, TIMEOUT_BUSCA_MS).catch(() => []);
      let match = melhorCorrespondencia(tituloBusca, livro.creator, daOpenLibrary);

      if (!match) {
        const doGoogle = await buscarLivrosGoogleBooks(termo, TIMEOUT_BUSCA_MS).catch(() => []);
        match = melhorCorrespondencia(tituloBusca, livro.creator, doGoogle);
      }

      if (match) encontrados.set(i, match);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCORRENCIA_BUSCA, livros.length) }, worker),
  );
  return encontrados;
}

/** Para o select de destino: todo mundo que tem perfil, do mais recente pro mais antigo. */
export async function listarUsuariosParaImportar(): Promise<{
  usuarios: UsuarioImportacao[];
  error: string | null;
}> {
  await requireUserId();
  if (!(await ehAdmin())) return { usuarios: [], error: "Só admin." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .order("created_at", { ascending: false });

  if (error) return { usuarios: [], error: "Não foi possível carregar os usuários." };

  return {
    usuarios: (data ?? []).map((p) => ({
      id: p.id as string,
      nome: (p.display_name as string | null) || (p.username as string | null) || (p.id as string),
    })),
    error: null,
  };
}

/**
 * Importa livros de um CSV da Amazon para a estante de um usuário escolhido.
 *
 * O CSV só traz título e autor; capa e páginas vêm de uma busca best-effort
 * (`enriquecerLivros`, Open Library + Google Books) com orçamento de tempo —
 * num lote grande, nem todo livro é completado antes do prazo, e o que sobra
 * entra do jeito que sempre entrou (ilustrado, sem páginas). Dá pra completar
 * depois, abrindo e editando.
 *
 * Todo livro entra como "lidos": o caso de uso é o admin com o CSV da
 * biblioteca Kindle inteira de alguém, e essa biblioteca é o que a pessoa já
 * comprou/leu — não faz sentido perguntar status por livro num lote de
 * centenas.
 *
 * Usa o client de service_role porque o destino não é o admin logado — a RLS
 * de `media_items` só deixa gravar com `user_id = auth.uid()`.
 */
export async function importarLivros(input: {
  livros: LivroImportado[];
  userId: string;
}): Promise<{ criados: number; pulados: number; error: string | null }> {
  await requireUserId();
  if (!(await ehAdmin())) {
    return { criados: 0, pulados: 0, error: "Importação disponível só para admin." };
  }
  if (!input.userId) {
    return { criados: 0, pulados: 0, error: "Escolha para quem importar." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { criados: 0, pulados: 0, error: "Importação indisponível no momento." };
  }

  const limpos = input.livros
    .map((l) => ({ title: l.title.trim(), creator: l.creator?.trim() || null }))
    .filter((l) => l.title.length > 0)
    .slice(0, MAXIMO);

  if (limpos.length === 0) {
    return { criados: 0, pulados: 0, error: "Nenhum livro válido no arquivo." };
  }

  // Duplicata é por título, comparado sem caixa: o CSV da Amazon repete livro
  // que a pessoa comprou duas vezes, e reimportar não pode dobrar a estante.
  const { data: existentes } = await admin
    .from("media_items")
    .select("title")
    .eq("user_id", input.userId);
  const jaTem = new Set(
    (existentes ?? []).map((l) => (l.title as string).trim().toLowerCase()),
  );

  const novos = limpos.filter((l) => !jaTem.has(l.title.toLowerCase()));
  const pulados = limpos.length - novos.length;

  if (novos.length === 0) {
    return { criados: 0, pulados, error: null };
  }

  const enriquecidos = await enriquecerLivros(novos);

  // Um único INSERT com várias linhas grava o mesmo `now()` em todas — a
  // estante (ordenada por criado_em) não tem como saber qual veio "primeiro"
  // dentro do lote, e a ordem que aparece vira arbitrária a cada consulta.
  // 1ms de diferença por linha já resolve, e mantém a ordem do CSV: o último
  // livro do arquivo (tipicamente o mais comprado recentemente na Amazon)
  // fica no topo da estante.
  const agora = Date.now();

  const { error } = await admin.from("media_items").insert(
    novos.map((l, i) => {
      const match = enriquecidos.get(i);
      return {
        user_id: input.userId,
        title: l.title,
        creator: l.creator ?? match?.autor ?? null,
        genre: match?.genero ?? null,
        status: "finished",
        cover_kind: match?.capaGrande ? "real" : "illustrated",
        cover_url: match?.capaGrande ?? null,
        cover_palette: paletteIndexForTitle(l.title),
        total_units: match?.paginas ?? null,
        created_at: new Date(agora + i).toISOString(),
      };
    }),
  );

  if (error) {
    console.error("[importar]", error.message);
    return { criados: 0, pulados, error: "Não foi possível importar. Tente de novo." };
  }

  revalidatePath("/estante");
  return { criados: novos.length, pulados, error: null };
}
