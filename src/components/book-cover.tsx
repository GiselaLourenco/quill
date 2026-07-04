import Image from "next/image";
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
        <Image
          src={item.cover_url}
          alt={`Capa de ${item.title}`}
          fill
          sizes="120px"
          className="object-cover"
        />
      </div>
    );
  }

  return <IllustratedCover title={item.title} paletteIndex={item.cover_palette} />;
}
