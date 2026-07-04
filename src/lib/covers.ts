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
  | { mode: "full"; text: string; size: "lg" | "sm" };

// Até 20 caracteres mostra o título inteiro (1 ou 2 linhas conforme o
// tamanho); acima disso cai pra letra inicial, pra não espremer a fonte.
export function renderCoverTitle(title: string): CoverTitleRendering {
  const trimmed = title.trim();
  if (trimmed.length > 20) {
    return { mode: "letter", text: trimmed[0]?.toUpperCase() ?? "?" };
  }
  return {
    mode: "full",
    text: trimmed,
    size: trimmed.length <= 12 ? "lg" : "sm",
  };
}
