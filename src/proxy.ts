import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas exceto assets estáticos e imagens otimizadas,
     * para não bloquear CSS/JS/imagens.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
