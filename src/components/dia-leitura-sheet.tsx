"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Portal } from "@/components/portal";
import { BookCover } from "@/components/book-cover";
import { sessoesDoDia, type SessaoDoDia } from "@/app/actions/sessions";

const TAG_CURTA: Record<string, string> = {
  flowed: "fluiu",
  no_distractions: "sem distração",
  phone: "celular",
  hard: "difícil",
};

export function tempoTexto(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

function tituloDia(chave: string): { semana: string; data: string } {
  // Meio-dia evita a data "voltar" um dia ao formatar em fuso negativo.
  const d = new Date(`${chave}T12:00:00`);
  const semana = d.toLocaleDateString("pt-BR", { weekday: "long" }).replace("-feira", "");
  return { semana, data: `${chave.slice(8, 10)}/${chave.slice(5, 7)}` };
}

/**
 * Painel que sobe ao tocar num dia do calendário da home: resumo do dia e cada
 * sessão registrada (horário, páginas, capítulos e como foi).
 */
export function DiaLeituraSheet({
  chave,
  hoje,
  onClose,
  carregar = sessoesDoDia,
  totalPaginas,
}: {
  chave: string;
  hoje: boolean;
  onClose: () => void;
  /** De onde vêm as sessões — a demo de desafio passa as simuladas. */
  carregar?: (chave: string) => Promise<SessaoDoDia[]>;
  /** Aberto pela página de um livro: o 4º número vira "% do livro" (contar
   *  livros daria sempre 1). `null` = livro sem total cadastrado. */
  totalPaginas?: number | null;
}) {
  const [sessoes, setSessoes] = useState<SessaoDoDia[] | null>(null);
  const [erro, setErro] = useState(false);

  // Montado com `key={chave}`: trocar de dia remonta, então não há estado
  // velho pra limpar aqui.
  useEffect(() => {
    let vivo = true;
    carregar(chave)
      .then((s) => vivo && setSessoes(s))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [chave, carregar]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { semana, data } = tituloDia(chave);
  const totalMin = (sessoes ?? []).reduce((s, x) => s + x.minutos, 0);
  const paginas = (sessoes ?? []).reduce(
    (s, x) => s + Math.max(0, (x.paginaFim ?? 0) - (x.paginaInicio ?? 0)),
    0,
  );
  const livros = new Set((sessoes ?? []).filter((x) => x.livro).map((x) => x.livro!.id)).size;
  const n = sessoes?.length ?? 0;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Leitura de ${semana}, ${data}`}
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
            {erro ? (
              <p className="py-10 text-center font-serif text-sm italic text-ink-soft">
                Não deu pra carregar as sessões. Feche e toque no dia de novo.
              </p>
            ) : sessoes === null ? (
              <p className="py-10 text-center font-serif text-sm italic text-ink-soft">Carregando…</p>
            ) : n === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-ink-soft px-4 py-6 text-center">
                <p className="font-serif text-sm italic text-ink-soft">
                  Nenhuma leitura registrada nesse dia.
                </p>
                {hoje && (
                  <Link
                    href="/ler"
                    className="shadow-hard-sm mt-3 inline-block border-2 border-ink bg-mustard px-3 py-2 font-display text-[11px] uppercase tracking-widest text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    + Registrar leitura
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 overflow-hidden rounded-xl border-2 border-ink bg-card text-center">
                  {[
                    { v: String(n), l: n === 1 ? "sessão" : "sessões" },
                    { v: tempoTexto(totalMin).replace(" min", "m"), l: "lido" },
                    { v: String(paginas), l: "páginas" },
                    totalPaginas
                      ? { v: `+${Math.round((paginas / totalPaginas) * 100)}%`, l: "do livro" }
                      : { v: String(livros), l: livros === 1 ? "livro" : "livros" },
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
                  {sessoes.map((s) => (
                    <li key={s.id}>
                      <SessaoItem s={s} />
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

/**
 * Cartão de uma sessão (capa, horário, páginas, como foi). `topo`/`rodape`
 * entram dentro do mesmo cartão — o painel do dia do desafio usa pra pôr o
 * nome de quem leu em cima e a nota/comentários embaixo.
 */
export function SessaoItem({
  s,
  topo,
  rodape,
}: {
  s: SessaoDoDia;
  topo?: ReactNode;
  rodape?: ReactNode;
}) {
  const chips: { texto: string; tag?: boolean }[] = [];
  if (s.paginaInicio != null && s.paginaFim != null && s.paginaFim > s.paginaInicio) {
    chips.push({ texto: `p. ${s.paginaInicio} → ${s.paginaFim} (+${s.paginaFim - s.paginaInicio})` });
  } else if (s.paginaFim != null && s.paginaFim > 0) {
    chips.push({ texto: `até p. ${s.paginaFim}` });
  }
  if (s.capituloFim != null) {
    chips.push({
      texto:
        s.capituloInicio != null && s.capituloInicio !== s.capituloFim
          ? `cap. ${s.capituloInicio} → ${s.capituloFim}`
          : `cap. ${s.capituloFim}`,
    });
  }
  for (const t of s.tags) chips.push({ texto: TAG_CURTA[t] ?? t, tag: true });

  const conteudo = (
    <>
      <div className="aspect-[2/3] w-11 shrink-0 overflow-hidden">
        {s.livro ? (
          <BookCover item={s.livro} />
        ) : (
          <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-ink-soft font-display text-[9px] uppercase text-ink-soft">
            livre
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-sm font-bold leading-tight text-ink">
          {s.livro?.title ?? "Sessão livre"}
        </p>
        {s.livro?.creator && <p className="truncate text-[11px] text-ink-soft">{s.livro.creator}</p>}
        <p className="mt-1.5 text-xs font-semibold tabular-nums text-ink">
          {s.inicio}
          {s.fim ? ` – ${s.fim}` : ""} · <span className="font-display font-normal">{tempoTexto(s.minutos)}</span>
        </p>
        {chips.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span
                key={c.texto}
                className={`rounded-full border-[1.5px] px-2 py-0.5 text-[10px] tabular-nums ${
                  c.tag
                    ? "border-dashed border-ink-soft font-semibold text-ink-soft"
                    : "border-ink bg-paper font-bold text-ink"
                }`}
              >
                {c.texto}
              </span>
            ))}
          </div>
        )}
      </div>
      {s.livro && (
        <span aria-hidden="true" className="self-center font-display text-ink-soft">
          ›
        </span>
      )}
    </>
  );

  const classe =
    "shadow-hard-sm flex items-start gap-3 rounded-xl border-2 border-ink bg-card p-2.5";

  if (topo || rodape) {
    // Com extras o cartão vira um contêiner, e só a linha do livro é link —
    // os botões do rodapé não podem ficar dentro de um <a>.
    return (
      <div className="shadow-hard-sm rounded-xl border-2 border-ink bg-card p-2.5">
        {topo}
        {s.livro ? (
          <Link href={`/books/${s.livro.id}`} className="flex items-start gap-3">
            {conteudo}
          </Link>
        ) : (
          <div className="flex items-start gap-3">{conteudo}</div>
        )}
        {rodape}
      </div>
    );
  }

  return s.livro ? (
    <Link href={`/books/${s.livro.id}`} className={`${classe} active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
