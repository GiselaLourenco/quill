import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createPublicClient, TAG_ARTES } from "@/lib/supabase/publico";

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
  if (!data?.updated_at) return VERSAO_ICONE_PADRAO;
  return String(Date.parse(data.updated_at as string) || VERSAO_ICONE_PADRAO);
}

/**
 * Versão do ícone quando ninguém escolheu arte no /admin.
 *
 * Precisa ser BUMPADA à mão sempre que `ICONE_PADRAO` mudar de arquivo: o
 * `?v=` só reflete o banco, e a rota manda cachear por um ano. Sem bumpar,
 * trocar o ícone no código não chega em quem já visitou.
 */
const VERSAO_ICONE_PADRAO = "4";

/** Slot do ícone do app (favicon + ícone da tela de início do iOS). */
export const SLOT_FAVICON = "app.favicon";

/**
 * Arte do ícone do APP — tela de início, e a abertura do PWA, que usa o de 512.
 *
 * SVG e não PNG: a rota rasteriza pra 32, 180, 192 e 512, e a partir do vetor
 * cada tamanho sai nítido em vez de reamostrado de um PNG só.
 */
export const ICONE_PADRAO = "/img/app/icone.svg";

/**
 * Arte da ABA do navegador, separada do ícone do app.
 *
 * São enquadramentos diferentes de propósito: no atalho da tela de início a
 * figura sozinha lê melhor, e na aba a cena do Quill escrevendo é mais
 * reconhecível — foi o que a versão antiga do atalho do Chrome mostrava.
 */
export const FAVICON_PADRAO = "/img/app/favicon.svg";

/**
 * Estilo CSS equivalente ao ajuste — usado por `<AppImage>`.
 *
 * A posição vira `translate`, não `object-position`: as artes são desenhadas
 * com `object-contain`, e aí a imagem já cabe inteira na caixa — não sobra
 * nada para o `object-position` deslocar, e mexer nele não fazia nada na tela.
 * Com `translate` o deslocamento vale sempre, em qualquer enquadramento.
 *
 * 50/50 é o centro; 0 e 100 empurram meia largura (ou meia altura) para cada
 * lado. A porcentagem do `translate` é do tamanho da própria imagem, então o
 * arrasto anda o mesmo tanto com qualquer zoom.
 */
export function estiloDoAjuste(a: AjusteImagem | undefined): React.CSSProperties {
  if (!a) return {};
  const partes: string[] = [];
  if (a.posX !== 50 || a.posY !== 50) {
    partes.push(`translate(${a.posX - 50}%, ${a.posY - 50}%)`);
  }
  if (a.zoom !== 100) partes.push(`scale(${a.zoom / 100})`);
  return partes.length ? { transform: partes.join(" ") } : {};
}


/* -------------------------------------------------------------------------
 * Versões cacheadas — usadas pelo layout raiz, que roda em TODA navegação.
 *
 * Sem isto, trocar de aba custava três consultas ao banco só pra montar a
 * moldura: ajustes, slots e a versão do ícone. São dados globais que mudam
 * quando alguém mexe no editor de artes, não a cada toque — e toda ação do
 * /admin invalida a tag, então a troca continua aparecendo na hora.
 * ---------------------------------------------------------------------- */

export const getAjustesImagemCache = unstable_cache(
  async () => getAjustesImagem(createPublicClient()),
  ["ajustes-imagem"],
  { tags: [TAG_ARTES] },
);

export const getSlotsImagemCache = unstable_cache(
  async () => getSlotsImagem(createPublicClient()),
  ["slots-imagem"],
  { tags: [TAG_ARTES] },
);

export const getVersaoIconeCache = unstable_cache(
  async () => getVersaoIcone(createPublicClient()),
  ["versao-icone"],
  { tags: [TAG_ARTES] },
);
