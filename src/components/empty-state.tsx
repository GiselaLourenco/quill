import { AppImage } from "@/components/app-image";
import Link from "next/link";

/**
 * Estado vazio padrão do Quill.
 *
 * Cada tela usa o mascote que combina com o que está faltando ali — o Quill
 * escrevendo onde falta anotação, lendo onde falta livro, confiante onde falta
 * gente. O texto fala do que a pessoa está vendo, nunca de outra tela.
 */
export type MascoteVazio = "lendo" | "escrevendo" | "confiante" | "comemorando";

const MASCOTE_SRC: Record<MascoteVazio, string> = {
  lendo: "/img/mascot/quill-lendo.webp",
  escrevendo: "/img/mascot/quill-escrevendo.webp",
  confiante: "/img/mascot/quill-confiante.webp",
  comemorando: "/img/mascot/quill-comemorando.webp",
};

export function EmptyState({
  mascote,
  titulo,
  texto,
  acao,
  compacto = false,
}: {
  mascote: MascoteVazio;
  titulo: string;
  texto: string;
  acao?: { href: string; label: string };
  compacto?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 text-center ${
        compacto ? "px-4 py-8" : "flex-1 justify-center px-6 py-14"
      }`}
    >
      <AppImage
        slot={`vazio.${mascote}`}
        src={MASCOTE_SRC[mascote]}
        alt=""
        aria-hidden
        width={220}
        height={150}
        className={compacto ? "w-28 max-w-full" : "w-40 max-w-full"}
      />
      <h2 className="font-display text-xl uppercase leading-none tracking-tight text-ink">
        {titulo}
      </h2>
      <p className="max-w-[280px] font-serif text-sm leading-snug text-ink-soft">{texto}</p>
      {acao && (
        <Link
          href={acao.href}
          className="shadow-hard-sm mt-1 rounded-md border-2 border-ink bg-mustard px-4 py-2.5 font-display text-xs uppercase tracking-wider text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          {acao.label}
        </Link>
      )}
    </div>
  );
}
