import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { getSlotsImagem, ICONE_PADRAO, SLOT_FAVICON } from "@/lib/ajustes-imagem";
import { arteValida } from "@/lib/artes";

/**
 * Ícone do app (favicon e ícone da tela de início do iOS).
 *
 * A arte é escolhida no /admin e sai do banco, então trocar não pede deploy.
 * Converte para PNG porque as artes são WebP e nem todo navegador aceita WebP
 * como favicon. A URL carrega `?v=` (ver `generateMetadata` na raiz), por isso
 * pode ser cacheada agressivamente.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tamanho = searchParams.get("tamanho") === "180" ? 180 : 32;

  const supabase = await createClient();
  const slots = await getSlotsImagem(supabase);
  const escolhida = slots[SLOT_FAVICON]?.src ?? null;
  const arte = escolhida && arteValida(escolhida) ? escolhida : ICONE_PADRAO;

  try {
    const bytes = await readFile(join(process.cwd(), "public", arte.replace(/^\//, "")));
    const png = await sharp(bytes)
      .resize(tamanho, tamanho, { fit: "contain", background: { r: 245, g: 236, b: 215, alpha: 1 } })
      .png()
      .toBuffer();

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("ícone indisponível", { status: 404 });
  }
}
