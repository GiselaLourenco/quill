import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { getSlotsImagem, ICONE_PADRAO, SLOT_FAVICON } from "@/lib/ajustes-imagem";
import { arteValida, ehArteEnviada } from "@/lib/artes";

const TAMANHOS = [32, 180, 192, 512] as const;

/**
 * Ícone do app (favicon, ícone da tela de início do iOS e os do manifest).
 *
 * A arte é escolhida no /admin e sai do banco, então trocar não pede deploy.
 * Converte para PNG porque as artes são WebP e nem todo navegador aceita WebP
 * como favicon. A URL carrega `?v=` (ver `generateMetadata` na raiz), por isso
 * pode ser cacheada agressivamente.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // 32 favicon · 180 iOS · 192 e 512 manifest (o Android exige os dois pra
  // instalar como app). Tamanho fora da lista cai no favicon.
  const pedido = Number(searchParams.get("tamanho"));
  const tamanho = (TAMANHOS as readonly number[]).includes(pedido) ? pedido : 32;

  const supabase = await createClient();
  const slots = await getSlotsImagem(supabase);
  const escolhida = slots[SLOT_FAVICON]?.src ?? null;
  const valida = escolhida && (ehArteEnviada(escolhida) || arteValida(escolhida));
  const arte = valida ? (escolhida as string) : ICONE_PADRAO;

  try {
    // Arte enviada pelo admin mora no Storage; as do código, em /public.
    const bytes = ehArteEnviada(arte)
      ? Buffer.from(await (await fetch(arte)).arrayBuffer())
      : await readFile(join(process.cwd(), "public", arte.replace(/^\//, "")));
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
