"use client";

import { useState, type ReactNode } from "react";

const ABAS = [
  { id: "leitura", label: "Leitura" },
  { id: "detalhes", label: "Detalhes" },
  { id: "notas", label: "Notas" },
] as const;

export type AbaLivro = (typeof ABAS)[number]["id"];

// Abas da página do meu livro. O conteúdo de cada uma vem pronto do servidor;
// aqui só se escolhe qual mostrar. Abre em "Leitura" — é o que muda toda vez
// que a pessoa lê.
export function LivroAbas({
  leitura,
  detalhes,
  notas,
  inicial = "leitura",
}: {
  leitura: ReactNode;
  detalhes: ReactNode;
  notas: ReactNode;
  inicial?: AbaLivro;
}) {
  const [aba, setAba] = useState<AbaLivro>(inicial);
  const conteudo = { leitura, detalhes, notas }[aba];

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Seções do livro"
        className="grid grid-cols-3 border-2 border-ink bg-white shadow-hard-sm"
      >
        {ABAS.map((a, i) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            id={`aba-${a.id}`}
            aria-selected={aba === a.id}
            aria-controls="painel-livro"
            onClick={() => setAba(a.id)}
            className={`min-h-11 font-display text-[11px] uppercase tracking-widest text-ink ${
              i < ABAS.length - 1 ? "border-r-2 border-ink" : ""
            } ${aba === a.id ? "bg-mustard" : "bg-white"}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="painel-livro" aria-labelledby={`aba-${aba}`} className="space-y-6">
        {conteudo}
      </div>
    </div>
  );
}
