import { COVER_PALETTE, renderCoverTitle } from "@/lib/covers";

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
            fontSize: rendering.size === "lg" ? "20px" : "15px",
            textAlign: "center",
          }}
        >
          {rendering.text}
        </span>
      )}
    </div>
  );
}
