/**
 * Busca de livros na Open Library — a fonte que preenche autor, páginas e capa
 * no cadastro.
 *
 * Por que Open Library e não Google Books: não pede chave nem cadastro. O
 * Google Books tem catálogo brasileiro melhor, mas a cota anônima é um balde
 * compartilhado que vive estourado (HTTP 429 em setembro/2026) — usar exigiria
 * chave própria e uma env a mais.
 *
 * O que ela NÃO tem: número de capítulos. Sumário não entra em base
 * bibliográfica; esse campo é manual em qualquer cenário.
 */

export type LivroEncontrado = {
  id: string;
  titulo: string;
  autor: string | null;
  paginas: number | null;
  ano: number | null;
  capaThumb: string | null;
  capaGrande: string | null;
};

type DocOpenLibrary = {
  key?: string;
  title?: string;
  author_name?: string[];
  number_of_pages_median?: number;
  first_publish_year?: number;
  cover_i?: number;
};

const CAMPOS =
  "key,title,author_name,number_of_pages_median,first_publish_year,cover_i";

/** Menos que isto busca meio mundo e não ajuda ninguém. */
export const MIN_CARACTERES = 3;

export async function buscarLivros(termo: string): Promise<LivroEncontrado[]> {
  const limpo = termo.trim();
  if (limpo.length < MIN_CARACTERES) return [];

  const url = new URL("https://openlibrary.org/search.json");
  // `q` e não `title`: aceita "torto arado" e também "torto arado itamar" —
  // com `title` a segunda forma não devolve nada.
  url.searchParams.set("q", limpo);
  url.searchParams.set("fields", CAMPOS);
  url.searchParams.set("limit", "5");

  let res: Response;
  try {
    res = await fetch(url, {
      // Eles pedem User-Agent identificado; anônimo pode ser limitado.
      headers: { "User-Agent": "Quill (app de leitura) quill-three-tau.vercel.app" },
      // A busca leva ~1s e às vezes trava. Melhor devolver vazio e deixar a
      // pessoa digitar do que segurar o formulário.
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const data = (await res.json().catch(() => null)) as {
    docs?: DocOpenLibrary[];
  } | null;

  return (data?.docs ?? []).map((doc, i) => ({
    id: doc.key ?? `ol-${i}`,
    titulo: doc.title ?? limpo,
    autor: doc.author_name?.[0] ?? null,
    // A mediana de páginas some em boa parte das edições brasileiras — some
    // mesmo, e a lista mostra "sem páginas" em vez de fingir um número.
    paginas: doc.number_of_pages_median ?? null,
    ano: doc.first_publish_year ?? null,
    capaThumb: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    capaGrande: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : null,
  }));
}
