// Paleta leve das capas ilustradas (Opção A) — hex espelhados de globals.css
// (--color-cover-1..4). Cada entrada tem um texto de contraste já checado.
export const COVER_PALETTE = [
  { bg: "#e28d6a", text: "#4a2e1d" },
  { bg: "#69b997", text: "#1d4a34" },
  { bg: "#f1ba65", text: "#4a3512" },
  { bg: "#6e6887", text: "#f5ecd7" },
] as const;

export function paletteIndexForTitle(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COVER_PALETTE.length;
}

export type CoverTitleRendering =
  | { mode: "letter"; text: string }
  | { mode: "full"; text: string; size: "lg" | "md" | "sm" };

/**
 * Até 20 caracteres mostra o título inteiro; acima disso cai pra letra inicial.
 *
 * O tamanho da fonte respeita DOIS limites e vale o menor deles:
 *
 * 1. Total de caracteres — manda no número de linhas. Título comprido com
 *    palavras curtas ("O Nome do Vento") precisa de fonte menor, senão vira
 *    uma palavra por linha.
 * 2. Maior palavra — manda na largura. É a palavra que não quebra:
 *    "Dom Casmurro" cabia pelo total, mas "Casmurro" sozinha vazava a capa.
 *
 * Usar só um dos dois quebra metade dos casos — foi o que aconteceu nas duas
 * tentativas anteriores.
 */
export function renderCoverTitle(title: string): CoverTitleRendering {
  const trimmed = title.trim();
  if (trimmed.length > 20) {
    return { mode: "letter", text: trimmed[0]?.toUpperCase() ?? "?" };
  }

  const ESCALA = ["lg", "md", "sm"] as const;

  const porTotal = trimmed.length <= 12 ? 0 : 1;

  const maiorPalavra = trimmed
    .split(/\s+/)
    .reduce((max, palavra) => Math.max(max, palavra.length), 0);
  const porPalavra = maiorPalavra <= 6 ? 0 : maiorPalavra <= 10 ? 1 : 2;

  return { mode: "full", text: trimmed, size: ESCALA[Math.max(porTotal, porPalavra)] };
}

/**
 * REGRA DE TAMANHO DA CAPA
 *
 * A capa do livro tem UMA medida em todo o app: a mesma da estante — ~92px de
 * largura, proporção 2:3. Não crie miniaturas menores em listas; use sempre o
 * `<BookThumb>`, que aplica esta medida. Antes existiam cinco tamanhos
 * diferentes (38, 40, 46, 54 e 90px) e o título saía cortado nos menores.
 *
 * A largura vive aqui como classe do Tailwind para que exista um único ponto
 * de mudança.
 */
export const COVER_BOX_CLASS = "w-[92px] shrink-0 aspect-[2/3]";
