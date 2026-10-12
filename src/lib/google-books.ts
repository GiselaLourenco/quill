/**
 * Busca de livros no Google Books — usada como segunda tentativa quando a
 * Open Library não acha nada (ver `open-library.ts`). O motivo de existir:
 * ficção brasileira/traduzida contemporânea (romance, YA) tem cobertura fraca
 * na Open Library, mas aparece bem melhor aqui.
 *
 * Exige `GOOGLE_BOOKS_API_KEY` — sem a env, `buscarLivrosGoogleBooks` sempre
 * devolve vazio (silenciosamente, pra não quebrar quem não configurou).
 */

import type { LivroEncontrado } from "@/lib/open-library";

type ItemGoogleBooks = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    publishedDate?: string;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
  };
};

/** O Google devolve capa em http:// — o otimizador de imagem do Next recusa fonte não-https. */
const paraHttps = (url: string) => url.replace(/^http:\/\//, "https://");

/**
 * `categories` vem no padrão BISAC ("Fiction / Fantasy / General") — só o
 * primeiro segmento interessa como gênero; o resto é subcategoria demais pro
 * que a home mostra.
 */
function generoDaCategoria(categories: string[] | undefined): string | null {
  const primeira = categories?.[0];
  if (!primeira) return null;
  return primeira.split("/")[0]!.trim() || null;
}

export async function buscarLivrosGoogleBooks(
  termo: string,
  timeoutMs = 6000,
): Promise<LivroEncontrado[]> {
  const chave = process.env.GOOGLE_BOOKS_API_KEY;
  const limpo = termo.trim();
  if (!chave || limpo.length < 3) return [];

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", limpo);
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("country", "BR");
  url.searchParams.set(
    "fields",
    "items(id,volumeInfo(title,authors,pageCount,publishedDate,imageLinks,categories))",
  );
  url.searchParams.set("key", chave);

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const data = (await res.json().catch(() => null)) as { items?: ItemGoogleBooks[] } | null;

  return (data?.items ?? []).map((item, i) => {
    const v = item.volumeInfo ?? {};
    const imagens = v.imageLinks ?? {};
    // Maior primeiro; a maioria dos volumes só tem thumbnail/smallThumbnail mesmo.
    const grande = imagens.extraLarge ?? imagens.large ?? imagens.medium ?? imagens.thumbnail ?? null;
    const pequena = imagens.thumbnail ?? imagens.smallThumbnail ?? null;
    return {
      id: item.id ?? `gb-${i}`,
      titulo: v.title ?? limpo,
      autor: v.authors?.[0] ?? null,
      paginas: v.pageCount ?? null,
      ano: v.publishedDate ? Number(v.publishedDate.slice(0, 4)) || null : null,
      capaThumb: pequena ? paraHttps(pequena) : null,
      capaGrande: grande ? paraHttps(grande) : null,
      genero: generoDaCategoria(v.categories),
    };
  });
}
