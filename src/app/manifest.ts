import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getVersaoIcone } from "@/lib/ajustes-imagem";

/**
 * Manifest do app.
 *
 * É o que faz o atalho da tela de início virar app de verdade em vez de
 * favorito: com `display: standalone`, o Android instala um WebAPK com entrada
 * própria no alternador de apps, e tocar no ícone volta pra janela que já está
 * aberta em vez de abrir uma aba nova no navegador. O iOS dá uma janela fora
 * das abas do Safari (junto com `appleWebApp` no layout).
 *
 * Os ícones saem da mesma rota do favicon, então trocar a arte pelo /admin
 * continua valendo pro ícone instalado — com o `?v=` pra furar o cache.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const supabase = await createClient();
  const v = await getVersaoIcone(supabase);

  return {
    id: "/",
    name: "Quill — sua leitura, viva",
    short_name: "Quill",
    description: "Estante, sessões de leitura e comunidade — no seu ritmo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    // Papel do app: o que aparece na tela de abertura e atrás da barra de
    // status, pra não piscar branco antes da primeira pintura.
    background_color: "#f5ecd7",
    theme_color: "#f5ecd7",
    icons: [
      {
        src: `/api/icone?tamanho=192&v=${v}`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `/api/icone?tamanho=512&v=${v}`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
