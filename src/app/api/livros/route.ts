import { NextResponse, type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buscarLivros, MIN_CARACTERES } from "@/lib/open-library";
import { buscarLivrosGoogleBooks } from "@/lib/google-books";
import { completarCapas } from "@/lib/capa-irma";

/**
 * Proxy da busca de livro pro cadastro/edição.
 *
 * Existe em vez de o browser chamar direto (as APIs até liberam CORS) por
 * três motivos: dá pra mandar o User-Agent que a Open Library pede, que o
 * navegador não deixa definir; dá pra cachear, que nenhuma das duas faz; e
 * mantém o formato da resposta nosso, então trocar de fonte não mexe na UI.
 *
 * Google Books primeiro, Open Library como fallback — ao contrário da
 * importação em lote. Lá ninguém revisa o resultado, então título tem que
 * bater exato; aqui a pessoa escolhe visualmente numa lista, então o ruído
 * do Google (coletâneas, edição estrangeira) não é problema, e a cobertura
 * de livro brasileiro/traduzido é bem melhor. Só cai pra Open Library sem
 * `GOOGLE_BOOKS_API_KEY` configurada ou sem nenhum resultado.
 *
 * A Open Library roda junto mesmo quando o Google acha algo: muita edição do
 * Google vem sem imagem, e aí a capa sai de uma edição irmã (ver
 * `completarCapas`). Antes ela só era consultada com o Google vazio, e quem
 * escolhia uma edição sem imagem ficava com a capa ilustrada.
 */

// Um dia de cache por termo: ficha de livro não muda, e a segunda busca por
// "dom casmurro" — sua ou de qualquer pessoa — volta instantânea.
const buscaCacheada = unstable_cache(
  async (termo: string) => {
    const [doGoogle, daOpenLibrary] = await Promise.all([
      buscarLivrosGoogleBooks(termo),
      buscarLivros(termo),
    ]);
    if (doGoogle.length === 0) return completarCapas(daOpenLibrary, daOpenLibrary);
    return completarCapas(doGoogle, [...doGoogle, ...daOpenLibrary]);
  },
  // Chave nova: o cache antigo guardou resultados sem a capa emprestada.
  ["livros-busca-v2"],
  { revalidate: 86_400 },
);

export async function GET(request: NextRequest) {
  // A rota é um proxy pra fora; sem isto vira proxy aberto pra qualquer um.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const termo = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (termo.length < MIN_CARACTERES) {
    return NextResponse.json({ livros: [] });
  }

  // Minúsculas pra "Dom Casmurro" e "dom casmurro" dividirem a mesma entrada.
  const livros = await buscaCacheada(termo.toLowerCase());
  return NextResponse.json({ livros });
}
