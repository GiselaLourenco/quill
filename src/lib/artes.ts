import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Bucket onde ficam as artes enviadas pelo admin dentro do app. */
export const BUCKET_ARTES = "artes";

/** Início de toda URL de arte enviada — é por ele que reconhecemos uma. */
export const PREFIXO_ARTES_ENVIADAS = `${
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
}/storage/v1/object/public/${BUCKET_ARTES}/`;

const EXTENSOES = /\.(webp|png|jpe?g|svg|gif|avif)$/i;

/**
 * Todas as imagens de /public — inclusive as de perfil e as da raiz. O editor
 * mostra o catálogo inteiro; qualquer arquivo que exista na pasta pode ir para
 * qualquer ponto do app.
 *
 * Só roda no servidor. Na Vercel a pasta `public` só entra no bundle da função
 * por causa do `outputFileTracingIncludes` no next.config — sem isso a lista
 * volta vazia em produção.
 */
export function listarArtes(): string[] {
  const raiz = join(process.cwd(), "public");
  const saida: string[] = [];
  const andar = (dir: string, prefixo: string) => {
    for (const nome of readdirSync(dir)) {
      if (nome.startsWith(".")) continue;
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) {
        andar(caminho, `${prefixo}/${nome}`);
      } else if (EXTENSOES.test(nome)) {
        saida.push(`${prefixo}/${nome}`);
      }
    }
  };
  try {
    andar(raiz, "");
  } catch {
    return [];
  }
  return saida.sort();
}

/** É uma arte enviada pelo admin (mora no Storage, não em /public)? */
export function ehArteEnviada(src: string): boolean {
  return (
    PREFIXO_ARTES_ENVIADAS.length > "/storage/v1/object/public/artes/".length &&
    src.startsWith(PREFIXO_ARTES_ENVIADAS) &&
    !src.includes("..")
  );
}

/**
 * As artes que o admin subiu pelo app, mais novas primeiro — elas entram no
 * mesmo catálogo das de /public/img.
 */
export async function listarArtesEnviadas(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET_ARTES).list("", {
    limit: 500,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error || !data) return [];
  return data
    .filter((arquivo) => EXTENSOES.test(arquivo.name))
    .map((arquivo) => `${PREFIXO_ARTES_ENVIADAS}${arquivo.name}`);
}

/** A arte existe em /public? É a lista de permissão do servidor. */
export function arteValida(src: string): boolean {
  return listarArtes().includes(src);
}

/** A arte enviada existe mesmo no bucket? (o cliente não grava URL arbitrária) */
export async function arteEnviadaValida(
  supabase: SupabaseClient,
  src: string,
): Promise<boolean> {
  if (!ehArteEnviada(src)) return false;
  const nome = decodeURIComponent(src.slice(PREFIXO_ARTES_ENVIADAS.length));
  if (!nome || nome.includes("/")) return false;
  const { data } = await supabase.storage
    .from(BUCKET_ARTES)
    .list("", { limit: 1, search: nome });
  return Boolean(data?.some((arquivo) => arquivo.name === nome));
}

/**
 * Artes de /public que o admin tirou da galeria. O arquivo continua no
 * repositório — some só da lista de escolha, e dá para voltar no /admin.
 */
export async function listarArtesOcultas(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("artes_ocultas").select("path");
  return (data ?? []).map((linha) => linha.path as string);
}

/**
 * O catálogo que o editor mostra: o que o admin enviou (mais novo primeiro)
 * junto com as artes do código, menos as que ele escondeu.
 */
export async function catalogoDeArtes(supabase: SupabaseClient): Promise<string[]> {
  const [enviadas, ocultas] = await Promise.all([
    listarArtesEnviadas(supabase),
    listarArtesOcultas(supabase),
  ]);
  const escondidas = new Set(ocultas);
  return [...enviadas, ...listarArtes().filter((arte) => !escondidas.has(arte))];
}
