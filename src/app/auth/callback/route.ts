import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ponto de chegada dos links que o Supabase manda por e-mail. Trocar o `code`
// do link pela sessão só é possível aqui, num Route Handler: um Server
// Component não consegue escrever cookie.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  // `next` sai da nossa própria URL de redirect, mas ainda assim só aceitamos
  // caminho interno — nunca um host de fora.
  const pedido = searchParams.get("next") ?? "/";
  const destino =
    pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";

  // O destino segue na origem de quem chegou (localhost em dev, o domínio da
  // Vercel em produção) — atrás do proxy da Vercel, quem manda é o
  // `x-forwarded-host`.
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = "";
  const host = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto");
  if (host) url.host = host;
  if (proto) url.protocol = `${proto}:`;

  if (!code) {
    url.searchParams.set("erro", "link");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  // Link vencido, já usado, ou aberto num navegador diferente do que pediu
  // (o `code_verifier` do PKCE fica no cookie de quem pediu).
  if (error) url.searchParams.set("erro", "link");

  return NextResponse.redirect(url);
}
