/**
 * BookCover — versão Lovable.
 * Usa cover_palette como string ("cover-1" … "cover-4") e cover_kind.
 * Usada pelas páginas da migração Lovable → Next.js.
 */
import type { Livro } from "@/lib/types";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-24 w-16",
  md: "h-32 w-20",
  lg: "h-40 w-28",
};

const PALETTE_BG: Record<Livro["cover_palette"], string> = {
  "cover-1": "bg-cover-1",
  "cover-2": "bg-cover-2",
  "cover-3": "bg-cover-3",
  "cover-4": "bg-cover-4",
};

type Props = {
  livro: Pick<Livro, "titulo" | "cover_kind" | "cover_url" | "cover_palette">;
  size?: Size;
  showSpine?: boolean;
};

function Spine() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 rounded-l-[6px] border-r border-black/15 bg-black/25" />
  );
}

export function BookCoverLovable({ livro, size = "md", showSpine = true }: Props) {
  const dims = SIZES[size];
  if (livro.cover_kind === "real" && livro.cover_url) {
    return (
      <div className={`cover-card ${dims} shrink-0`}>
        {showSpine && <Spine />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={livro.cover_url}
          alt={livro.titulo}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={`cover-card ${dims} ${PALETTE_BG[livro.cover_palette]} shrink-0 flex items-center justify-center p-2`}
    >
      {showSpine && <Spine />}
      <span className="relative z-10 text-center font-display text-[11px] leading-tight text-ink break-words">
        {livro.titulo}
      </span>
    </div>
  );
}
