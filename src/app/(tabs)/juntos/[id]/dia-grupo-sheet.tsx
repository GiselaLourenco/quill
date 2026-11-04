"use client";

import { useEffect } from "react";
import { Portal } from "@/components/portal";
import { SessaoItem, tempoTexto } from "@/components/dia-leitura-sheet";
import type { SessaoDoDia } from "@/app/actions/sessions";
import { CheckinConversa, type CheckinDetalhe, type ComentarCheckin } from "./checkin-card";

function tituloDia(chave: string): { semana: string; data: string } {
  // Meio-dia evita a data "voltar" um dia ao formatar em fuso negativo.
  const d = new Date(`${chave}T12:00:00`);
  const semana = d.toLocaleDateString("pt-BR", { weekday: "long" }).replace("-feira", "");
  return { semana, data: `${chave.slice(8, 10)}/${chave.slice(5, 7)}` };
}

/**
 * Painel do dia no desafio — o mesmo do calendário da aba Quill (resumo +
 * registros), só que com o check-in de todo mundo: cada cartão diz quem leu e
 * traz a nota, os comentários e o "comentar".
 */
export function DiaGrupoSheet({
  chave,
  hoje,
  checkins,
  comentar,
  meuNome,
  minhaCor,
  onClose,
}: {
  chave: string;
  hoje: boolean;
  checkins: CheckinDetalhe[];
  comentar: ComentarCheckin;
  meuNome: string;
  minhaCor: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { semana, data } = tituloDia(chave);
  const pessoas = new Set(checkins.map((c) => c.userId)).size;
  const sessoes = checkins.map((c) => c.sessao).filter((x): x is SessaoDoDia => x != null);
  const totalMin = sessoes.reduce((t, x) => t + x.minutos, 0);
  const paginas = sessoes.reduce(
    (t, x) => t + Math.max(0, (x.paginaFim ?? 0) - (x.paginaInicio ?? 0)),
    0,
  );
  const livros = new Set(sessoes.filter((x) => x.livro).map((x) => x.livro!.title)).size;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Check-ins de ${semana}, ${data}`}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl border-x-2 border-t-2 border-ink bg-paper pb-8"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                {hoje ? "hoje · " : ""}
                {data}
              </p>
              <h2 className="font-display text-lg uppercase tracking-tight text-ink">{semana}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="shadow-hard-sm flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="space-y-3 px-4 pt-4">
            {checkins.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-ink-soft px-4 py-6 text-center">
                <p className="font-serif text-sm italic text-ink-soft">Ninguém fez check-in nesse dia.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 overflow-hidden rounded-xl border-2 border-ink bg-card text-center">
                  {[
                    { v: String(pessoas), l: pessoas === 1 ? "pessoa" : "pessoas" },
                    { v: tempoTexto(totalMin).replace(" min", "m"), l: "lido" },
                    { v: String(paginas), l: "páginas" },
                    { v: String(livros), l: livros === 1 ? "livro" : "livros" },
                  ].map((x, i) => (
                    <div key={x.l} className={`px-1 py-2 ${i > 0 ? "border-l-2 border-ink" : ""}`}>
                      <strong className="block font-display text-lg tabular-nums text-ink">{x.v}</strong>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">{x.l}</span>
                    </div>
                  ))}
                </div>

                <p className="pt-1 font-display text-[10px] uppercase tracking-widest text-ink-soft">
                  Registros do dia
                </p>
                <ul className="space-y-2.5">
                  {checkins.map((c) => (
                    <li key={c.id}>
                      <SessaoItem
                        s={c.sessao ?? semSessao(c)}
                        topo={
                          <p className="mb-2 flex items-center gap-1.5 font-display text-[10px] uppercase tracking-widest text-ink">
                            <i aria-hidden className="h-3 w-3 border-2 border-ink" style={{ backgroundColor: c.cor }} />
                            {c.nome}
                          </p>
                        }
                        rodape={
                          <CheckinConversa c={c} comentar={comentar} meuNome={meuNome} minhaCor={minhaCor} />
                        }
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

/** Check-in sem sessão visível (ex.: livro de quem não é seu amigo) — só o tempo. */
function semSessao(c: CheckinDetalhe): SessaoDoDia {
  return {
    id: c.id,
    inicio: "",
    fim: null,
    minutos: 0,
    paginaInicio: null,
    paginaFim: null,
    capituloInicio: null,
    capituloFim: null,
    tags: [],
    livro: null,
  };
}
