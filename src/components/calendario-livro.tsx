"use client";

import { useCallback, useMemo, useState } from "react";
import { DiaLeituraSheet, tempoTexto } from "@/components/dia-leitura-sheet";
import { sessoesDoLivroNoDia } from "@/app/actions/sessoes-livro";
import { addDaysToKey } from "@/lib/date-br";

/** Dia com pelo menos isso de leitura ganha o verde cheio. */
const MIN_DIA_FORTE = 30;

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * Calendário da aba Leitura: só os dias em que esse livro foi lido. Começa
 * recolhido numa faixa (total de dias + os últimos 7 em quadradinhos); tocar
 * nela abre o mês. Vai do mês do primeiro dia até hoje (ou até o último dia,
 * se já terminou); tocar num dia abre o painel da home, filtrado pro livro.
 * Livro relido recebe `marcas` com o início e o fim de cada leitura.
 */
export function CalendarioLivro({
  itemId,
  minutosPorDia,
  ultimoDia,
  hoje,
  terminado,
  totalPaginas,
  marcas,
}: {
  itemId: string;
  /** YYYY-MM-DD → minutos lidos nesse livro (já com a regra de virar a noite). */
  minutosPorDia: Record<string, number>;
  /** Até onde o calendário vai: hoje, ou o último dia lido se terminou. */
  ultimoDia: string;
  hoje: string;
  terminado: boolean;
  totalPaginas: number | null;
  /** YYYY-MM-DD → etiqueta ("início", "fim", "fim/início"). Sem isso, marca
   * o primeiro dia lido e (se terminou) o último. */
  marcas?: Record<string, string>;
}) {
  const dias = useMemo(() => Object.keys(minutosPorDia).sort(), [minutosPorDia]);
  const primeiroDia = dias[0]!;
  const fimDaLeitura = dias[dias.length - 1]!;
  const diasMarcados = marcas ? Object.keys(marcas).sort() : [];
  const inicioRange = diasMarcados[0] && diasMarcados[0] < primeiroDia ? diasMarcados[0] : primeiroDia;
  const ultimaMarca = diasMarcados.at(-1);
  const fimRange = ultimaMarca && ultimaMarca > ultimoDia ? ultimaMarca : ultimoDia;

  // Meses "YYYY-MM" do primeiro dia (lido ou marcado) até o último.
  const meses = useMemo(() => {
    const lista: string[] = [];
    let [y, m] = inicioRange.slice(0, 7).split("-").map(Number) as [number, number];
    const fim = fimRange.slice(0, 7);
    for (;;) {
      const p = `${y}-${String(m).padStart(2, "0")}`;
      lista.push(p);
      if (p >= fim) break;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return lista;
  }, [inicioRange, fimRange]);

  const [aberto, setAberto] = useState(false);
  const [mesIdx, setMesIdx] = useState(meses.length - 1);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const carregar = useCallback((chave: string) => sessoesDoLivroNoDia(itemId, chave), [itemId]);

  const prefixo = meses[mesIdx]!;
  const [ano, mes] = prefixo.split("-").map(Number) as [number, number];
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const diasNoMes = new Date(ano, mes, 0).getDate();

  const cells: Array<number | null> = [];
  for (let i = 0; i < primeiroDiaSemana; i += 1) cells.push(null);
  for (let d = 1; d <= diasNoMes; d += 1) cells.push(d);

  // Os 7 dias até `ultimoDia`, do mais antigo pro mais recente.
  const ultimos7 = Array.from({ length: 7 }, (_, i) => addDaysToKey(ultimoDia, i - 6));

  const doMes = dias.filter((d) => d.startsWith(prefixo));
  const minutosMes = doMes.reduce((s, d) => s + minutosPorDia[d]!, 0);

  return (
    <section
      aria-label="Dias em que você leu este livro"
      className="shadow-hard overflow-hidden rounded-2xl border-2 border-ink bg-paper"
    >
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-2 bg-card px-3 py-2.5 text-left active:bg-ink/5"
      >
        <div>
        <h3 className="font-display text-[11px] uppercase tracking-widest text-ink">Dias com este livro</h3>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-moss">
          {dias.length} {dias.length === 1 ? "dia" : "dias"} · desde {primeiroDia.slice(8, 10)}/
          {primeiroDia.slice(5, 7)}
        </p>
        <div className="mt-1.5 flex gap-[3px]" aria-hidden="true">
          {ultimos7.map((chave) => {
            const min = minutosPorDia[chave];
            return (
              <span
                key={chave}
                className={`h-2.5 w-2.5 border-[1.5px] border-ink ${
                  min === undefined ? "bg-paper" : min >= MIN_DIA_FORTE ? "bg-moss" : "bg-moss/40"
                }`}
              />
            );
          })}
        </div>
        </div>
        <span
          aria-hidden="true"
          className={`font-display text-sm text-ink transition-transform ${aberto ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>

      {aberto && (
      <div className="border-t-2 border-ink p-3">
        <div className="mb-2 flex items-center justify-between">
          <SetaMes
            direcao="‹"
            rotulo="Mês anterior"
            desabilitado={mesIdx === 0}
            onClick={() => setMesIdx((i) => Math.max(0, i - 1))}
          />
          <div className="flex flex-col items-center">
            <h4 className="font-display text-base uppercase text-ink">{NOMES_MES[mes - 1]}</h4>
            <span className="text-[10px] font-bold uppercase text-ink/50">{ano}</span>
          </div>
          <SetaMes
            direcao="›"
            rotulo="Próximo mês"
            desabilitado={mesIdx >= meses.length - 1}
            onClick={() => setMesIdx((i) => Math.min(meses.length - 1, i + 1))}
          />
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-ink/40">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square" />;
            const chave = `${prefixo}-${String(d).padStart(2, "0")}`;
            const min = minutosPorDia[chave];
            const leu = min !== undefined;
            const marca = marcas
              ? (marcas[chave] ?? null)
              : chave === primeiroDia
                ? "início"
                : terminado && chave === fimDaLeitura
                  ? "fim"
                  : null;
            return (
              <button
                type="button"
                key={i}
                disabled={!leu}
                onClick={() => setDiaAberto(chave)}
                aria-label={
                  leu ? `Dia ${d}: ${tempoTexto(min)} de leitura — ver registros` : `Dia ${d}: sem leitura deste livro`
                }
                className={[
                  "relative flex aspect-square items-center justify-center border-2 font-display text-[11px]",
                  leu
                    ? `border-ink active:translate-x-[1px] active:translate-y-[1px] ${
                        min >= MIN_DIA_FORTE ? "bg-moss text-paper" : "bg-moss/40 text-ink"
                      }`
                    : "border-transparent text-ink/30",
                  chave === hoje ? "shadow-[0_0_0_2px_var(--color-coral)]" : "",
                ].join(" ")}
              >
                {d}
                {marca && (
                  <span className="absolute -right-1.5 -top-2 rounded-md border-[1.5px] border-ink bg-mustard px-1 font-sans text-[7px] font-bold leading-[11px] text-ink">
                    {marca}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-center font-serif text-[11px] italic text-ink/70">
          {doMes.length > 0
            ? `${doMes.length} ${doMes.length === 1 ? "dia lido" : "dias lidos"} em ${NOMES_MES[mes - 1]} · ${tempoTexto(minutosMes)}`
            : `nenhum dia lido em ${NOMES_MES[mes - 1]}`}
        </p>
      </div>
      )}

      {diaAberto && (
        <DiaLeituraSheet
          key={diaAberto}
          chave={diaAberto}
          hoje={diaAberto === hoje}
          onClose={() => setDiaAberto(null)}
          carregar={carregar}
          totalPaginas={totalPaginas}
        />
      )}
    </section>
  );
}

function SetaMes({
  direcao,
  rotulo,
  desabilitado,
  onClick,
}: {
  direcao: "‹" | "›";
  rotulo: string;
  desabilitado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      aria-label={rotulo}
      className="shadow-hard-sm flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper font-display text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-30"
    >
      {direcao}
    </button>
  );
}

