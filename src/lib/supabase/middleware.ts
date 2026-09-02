import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];

// Redefinição de senha: precisa abrir deslogada (o link do e-mail chega antes
// da troca do `code`) e também logada (depois da troca já existe sessão de
// recuperação). Fica de fora dos dois redirects abaixo.
const RECOVERY_PATHS = ["/auth/callback", "/auth/reset"];

// O ícone do app é pedido pelo navegador sem sessão (inclusive na tela de
// login) e não pode cair em nenhum dos dois redirects abaixo.
// O ícone e o manifest são pedidos pelo navegador sem sessão — inclusive na
// hora de instalar o app pela tela de início.
const OPEN_PATHS = ["/api/icone", "/manifest.webmanifest"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // getClaims() valida o token (local ou via Auth server) — não usar
  // getSession() aqui, o user dela não é verificado.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims;
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (RECOVERY_PATHS.includes(pathname) || OPEN_PATHS.includes(pathname)) {
    return response;
  }

  if (!isAuthenticated && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
