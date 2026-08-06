import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas exceto assets estáticos e imagens otimizadas,
     * para não bloquear CSS/JS/imagens. Exclui também arquivos de imagem em
     * /public (ex.: /img/mascot/*.webp) — senão o middleware redireciona o
     * asset para /login e o next/image não consegue carregá-lo.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
