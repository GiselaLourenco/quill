import { COVER_PALETTE, renderCoverTitle } from "@/lib/covers";

/**
 * Capa ilustrada: fundo da paleta + título.
 *
 * A tipografia é fixa em px de propósito. Ela foi calibrada para a capa da
 * estante, e como TODA capa do app usa a mesma medida (ver `COVER_BOX_CLASS`),
 * o resultado é idêntico em qualquer tela. Se um dia surgir uma capa de outro
 * tamanho, é a medida que deve voltar ao padrão — não esta fonte.
 */
export function IllustratedCover({
  title,
  paletteIndex,
}: {
  title: string;
  paletteIndex: number;
}) {
  const palette = COVER_PALETTE[paletteIndex] ?? COVER_PALETTE[0];
  const rendering = renderCoverTitle(title);

  return (
    <div
      className="cover-card flex h-full w-full items-center justify-center px-2"
      style={{
        background: palette.bg,
        ["--cover-bg" as string]: palette.bg,
      }}
    >
      {rendering.mode === "letter" ? (
        <span
          className="font-serif text-4xl font-semibold"
          style={{ color: palette.text }}
        >
          {rendering.text}
        </span>
      ) : (
        <span
          className="font-serif font-semibold leading-tight"
          style={{
            color: palette.text,
            fontSize: { lg: "20px", md: "15px", sm: "12px" }[rendering.size],
            textAlign: "center",
            // Rede de segurança para palavras gigantes. Tem que ser
            // "break-word", nunca "anywhere": esta última entra no cálculo de
            // largura mínima e picota o título em uma palavra por linha.
            overflowWrap: "break-word",
          }}
        >
          {rendering.text}
        </span>
      )}
    </div>
  );
}
