import { NextResponse, type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buscarLivros, MIN_CARACTERES } from "@/lib/open-library";

/**
 * Proxy da busca da Open Library.
 *
 * Existe em vez de o browser chamar direto (a API até libera CORS) por três
 * motivos: dá pra mandar o User-Agent que eles pedem, que o navegador não
 * deixa definir; dá pra cachear, que a Open Library não faz (medi o mesmo
 * termo duas vezes: 0,96s e 1,00s); e mantém o formato da resposta nosso, então
 * trocar de fonte um dia não mexe na UI.
 */

// Um dia de cache por termo: ficha de livro não muda, e a segunda busca por
// "dom casmurro" — sua ou de qualquer pessoa — volta instantânea.
const buscaCacheada = unstable_cache(
  async (termo: string) => buscarLivros(termo),
  ["open-library-busca"],
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
