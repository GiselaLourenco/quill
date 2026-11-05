import { notFound } from "next/navigation";
import { FreeReadingSession, type BookOption } from "@/components/free-reading-session";
import type { ActiveChallenge } from "@/lib/challenges";

/**
 * Aba Ler simulada (só em `next dev`): livros e desafios ativos de mentira,
 * pra testar o registro (nota do livro × "comentar" do desafio) sem gravar
 * nada. Em produção responde 404.
 */
export default function LerDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const livro = (
    id: string,
    title: string,
    author: string,
    cover_palette: number,
    paginaAtual: number | null,
    extra: Partial<BookOption> = {},
  ): BookOption => ({
    id: `demo-${id}`,
    title,
    author,
    cover_kind: "illustrated",
    cover_url: null,
    cover_palette,
    status: "reading",
    paginaAtual,
    capituloAtual: null,
    totalPaginas: null,
    totalCapitulos: null,
    ...extra,
  });

  // Um livro por caso do "Onde você parou?": com posição e total, sem
  // posição nenhuma (pergunta da primeira sessão), só capítulos, e um
  // terminado (a busca da estante oferece "reler").
  const books: BookOption[] = [
    livro("mistborn", "Mistborn", "Brandon Sanderson", 3, 214, { totalPaginas: 640 }),
    livro("circe", "Circe", "Madeline Miller", 1, 87, { totalPaginas: 400 }),
    livro("duna", "Duna", "Frank Herbert", 2, null),
    livro("torto", "Torto Arado", "Itamar Vieira Junior", 0, null, { capituloAtual: 12, totalCapitulos: 40 }),
    livro("hobbit", "O Hobbit", "J.R.R. Tolkien", 2, 310, { status: "finished", totalPaginas: 310 }),
  ];

  const activeChallenges: ActiveChallenge[] = [
    { id: "demo-1", name: "Perdi o controle da minha vida", scoring_metric: "active_days" },
    { id: "demo-2", name: "Um ano lendo", scoring_metric: "pages" },
    { id: "demo-3", name: "Maratona de novembro", scoring_metric: "minutes" },
  ];

  return (
    <div className="flex-1">
      <FreeReadingSession books={books} activeChallenges={activeChallenges} demo />
    </div>
  );
}
