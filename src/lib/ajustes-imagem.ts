import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ajuste de enquadramento de uma imagem do app.
 *
 * O admin move e dá zoom; guardamos os números, não uma nova imagem. O arquivo
 * em /public nunca muda — cada tela aplica o ajuste na hora de renderizar. Por
 * isso o efeito é imediato para todo mundo e não exige deploy.
 */
export type AjusteImagem = { zoom: number; posX: number; posY: number };

export const AJUSTE_PADRAO: AjusteImagem = { zoom: 100, posX: 50, posY: 50 };

export type MapaAjustes = Record<string, AjusteImagem>;

/**
 * Configuração de um *slot* — um ponto fixo do app ("o avatar da home", "o
 * mascote do login"). Além do enquadramento, guarda QUAL arte fica ali: a
 * mesma arte aparece em vários lugares, e cada lugar pode querer outra.
 * `src: null` significa "usa a arte que o código define".
 */
export type SlotImagem = AjusteImagem & { src: string | null };

export type MapaSlots = Record<string, SlotImagem>;

export async function getAjustesImagem(supabase: SupabaseClient): Promise<MapaAjustes> {
  const { data } = await supabase
    .from("image_adjustments")
    .select("path, zoom, pos_x, pos_y");

  const mapa: MapaAjustes = {};
  for (const linha of data ?? []) {
    mapa[linha.path as string] = {
      zoom: (linha.zoom as number) ?? 100,
      posX: (linha.pos_x as number) ?? 50,
      posY: (linha.pos_y as number) ?? 50,
    };
  }
  return mapa;
}

export async function getSlotsImagem(supabase: SupabaseClient): Promise<MapaSlots> {
  const { data } = await supabase
    .from("image_slots")
    .select("slot, src, zoom, pos_x, pos_y");

  const mapa: MapaSlots = {};
  for (const linha of data ?? []) {
    mapa[linha.slot as string] = {
      src: (linha.src as string | null) ?? null,
      zoom: (linha.zoom as number) ?? 100,
      posX: (linha.pos_x as number) ?? 50,
      posY: (linha.pos_y as number) ?? 50,
    };
  }
  return mapa;
}

/**
 * Quando o favicon mudou pela última vez — vira `?v=` na URL do ícone para o
 * navegador não continuar mostrando o antigo (favicon é cache agressivo).
 */
export async function getVersaoIcone(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from("image_slots")
    .select("updated_at")
    .eq("slot", SLOT_FAVICON)
    .maybeSingle();
  if (!data?.updated_at) return "0";
  return String(Date.parse(data.updated_at as string) || "0");
}

/** Slot do ícone do app (favicon + ícone da tela de início do iOS). */
export const SLOT_FAVICON = "app.favicon";

/** Arte usada como ícone enquanto o admin não escolher outra. */
export const ICONE_PADRAO = "/img/app/icone.png";

/** Estilo CSS equivalente ao ajuste — usado por `<AppImage>`. */
export function estiloDoAjuste(a: AjusteImagem | undefined): React.CSSProperties {
  if (!a) return {};
  const estilo: React.CSSProperties = {};
  if (a.zoom !== 100) estilo.transform = `scale(${a.zoom / 100})`;
  if (a.posX !== 50 || a.posY !== 50) estilo.objectPosition = `${a.posX}% ${a.posY}%`;
  return estilo;
}
