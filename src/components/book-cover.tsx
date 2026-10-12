import { IllustratedCover } from "@/components/illustrated-cover";

export type CoverFields = {
  title: string;
  cover_kind: string;
  cover_url: string | null;
  cover_palette: number;
};

export function BookCover({ item }: { item: CoverFields }) {
  if (item.cover_kind === "real" && item.cover_url) {
    return (
      <div className="cover-card h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- capa do Open
        Library/Google Books já vem no tamanho certo; next/image só gastava
        cota de transformação da Vercel à toa (ver busca-livro.tsx). */}
        <img
          src={item.cover_url}
          alt={`Capa de ${item.title}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return <IllustratedCover title={item.title} paletteIndex={item.cover_palette} />;
}
