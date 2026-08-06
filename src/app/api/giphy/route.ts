import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";

// Proxy do Giphy — mantém a GIPHY_API_KEY no servidor (nunca vai pro cliente).
// Busca por termo; sem termo, retorna os em alta.
export async function GET(request: Request) {
  await requireUserId();

  const key = process.env.GIPHY_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GIF indisponível" }, { status: 503 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const base = q
    ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}&`
    : "https://api.giphy.com/v1/gifs/trending?";
  const url = `${base}api_key=${key}&limit=18&rating=pg-13&bundle=fixed_width_small`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const gifs = (json.data ?? []).map(
      (g: {
        id: string;
        title?: string;
        images: {
          fixed_width_small: { url: string };
          fixed_width: { url: string };
        };
      }) => ({
        id: g.id,
        title: g.title ?? "GIF",
        preview: g.images.fixed_width_small.url,
        full: g.images.fixed_width.url,
      }),
    );
    return NextResponse.json({ gifs });
  } catch {
    return NextResponse.json({ error: "Não foi possível buscar GIFs" }, { status: 502 });
  }
}
