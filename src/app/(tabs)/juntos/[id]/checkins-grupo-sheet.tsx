"use client";

import { useMemo, useState } from "react";
import { todayLocalDateKey } from "@/lib/date-br";

export type MembroCor = { userId: string; nome: string; cor: string; ehVoce: boolean };
export type CheckinDia = { userId: string; dia: string };

const MES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"];

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * "Check-ins do mês" do grupo: um ponto por membro que fez check-in no dia,
 * com filtro por pessoa. A cor de cada membro é a mesma do feed.
 */
export function CheckinsGrupoSheet({
  membros,
  checkins,
  comecaEm,
  onClose,
}: {
  membros: MembroCor[];
  checkins: CheckinDia[];
  comecaEm: string | null;
  onClose: () => void;
}) {
  const hojeChave = todayLocalDateKey();
  const [mesAno, setMesAno] = useState({
    ano: Number(hojeChave.slice(0, 4)),
    mes: Number(hojeChave.slice(5, 7)),
  });
  const [filtro, setFiltro] = useState<string | null>(null); // null = todos

  const limiteInicio = comecaEm ? comecaEm.slice(0, 7) : null;
  const mesChave = `${mesAno.ano}-${pad2(mesAno.mes)}`;
  const podeAnterior = !limiteInicio || mesChave > limiteInicio;
  const podeProximo = mesChave < hojeChave.slice(0, 7);

  const mudarMes = (delta: number) =>
    setMesAno(({ ano, mes }) => {
      const base = new Date(ano, mes - 1 + delta, 1);
      return { ano: base.getFullYear(), mes: base.getMonth() + 1 };
    });

  // dia → membros com check-in, já na ordem da legenda
  const porDia = useMemo(() => {
    const ordem = new Map(membros.map((m, i) => [m.userId, i]));
    const mapa = new Map<string, MembroCor[]>();
    for (const c of checkins) {
      if (filtro && c.userId !== filtro) continue;
      const m = membros.find((x) => x.userId === c.userId);
      if (!m) continue;
      mapa.set(c.dia, [...(mapa.get(c.dia) ?? []), m]);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => (ordem.get(a.userId) ?? 0) - (ordem.get(b.userId) ?? 0));
    }
    return mapa;
  }, [checkins, membros, filtro]);

  const offset = new Date(mesAno.ano, mesAno.mes - 1, 1).getDay();
  const diasNoMes = new Date(mesAno.ano, mesAno.mes, 0).getDate();
  const sobra = (7 - ((offset + diasNoMes) % 7)) % 7;
  const nomeChip = (m: MembroCor) => (m.ehVoce ? "Você" : m.nome);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 px-4 pb-6 pt-16 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-[380px] flex-col overflow-y-auto border-2 border-ink bg-paper p-4 shadow-hard"
      >
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-display text-[11px] uppercase tracking-widest text-ink"
          >
            ‹ Desafio
          </button>
          <h3 className="flex-1 text-center font-serif text-lg italic leading-none text-ink">
            Check-ins do mês
          </h3>
          <span className="w-[62px]" aria-hidden />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => mudarMes(-1)}
            disabled={!podeAnterior}
            aria-label="Mês anterior"
            className="px-2 font-display text-lg text-ink disabled:opacity-30"
          >
            ‹
          </button>
          <span className="font-display text-sm uppercase tracking-widest text-ink">
            {MES_LABEL[mesAno.mes - 1]} {mesAno.ano}
          </span>
          <button
            type="button"
            onClick={() => mudarMes(1)}
            disabled={!podeProximo}
            aria-label="Próximo mês"
            className="px-2 font-display text-lg text-ink disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[null, ...membros.map((m) => m.userId)].map((uid) => {
            const m = uid ? membros.find((x) => x.userId === uid)! : null;
            const ativo = filtro === uid;
            return (
              <button
                key={uid ?? "todos"}
                type="button"
                onClick={() => setFiltro(uid)}
                aria-pressed={ativo}
                className={`shadow-hard-sm border-2 border-ink px-3 py-1.5 font-display text-[10px] uppercase tracking-widest active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                  ativo ? "bg-moss text-paper" : "bg-paper text-ink"
                }`}
              >
                {m ? nomeChip(m) : "Todos"}
              </button>
            );
          })}
        </div>

        <div className="shadow-hard-sm border-2 border-ink bg-paper p-3">
          <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center font-display text-[9px] uppercase text-ink-soft">
            {DIAS_LABEL.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: offset }, (_, i) => (
              <span key={`a-${i}`} className="aspect-square border-2 border-dashed border-ink/20" />
            ))}
            {Array.from({ length: diasNoMes }, (_, i) => {
              const dia = i + 1;
              const chave = `${mesChave}-${pad2(dia)}`;
              const quem = porDia.get(chave) ?? [];
              return (
                <div
                  key={chave}
                  className={`relative aspect-square border-2 p-1 ${
                    chave === hojeChave ? "border-coral" : "border-ink"
                  }`}
                  aria-label={`Dia ${dia}: ${quem.length ? quem.map(nomeChip).join(", ") : "sem check-in"}`}
                >
                  <span className="block font-display text-[10px] leading-none text-ink">{dia}</span>
                  {quem.length > 0 && (
                    <div className="absolute inset-x-0.5 bottom-1 flex flex-wrap justify-center gap-[2px]">
                      {quem.map((m) => (
                        <i
                          key={m.userId}
                          className="h-[6px] w-[6px] rounded-full border border-ink"
                          style={{ backgroundColor: m.cor }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {Array.from({ length: sobra }, (_, i) => (
              <span key={`d-${i}`} className="aspect-square border-2 border-dashed border-ink/20" />
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {membros.map((m) => (
            <span
              key={m.userId}
              className="inline-flex items-center gap-1.5 font-display text-[10px] uppercase tracking-widest text-ink"
            >
              <i className="h-2.5 w-2.5 rounded-full border border-ink" style={{ backgroundColor: m.cor }} />
              {nomeChip(m)}
            </span>
          ))}
        </div>
        <p className="mt-3 font-serif text-xs italic text-ink-soft">
          Cada ponto = um membro com check-in no dia. Filtre por pessoa nos chips acima.
        </p>
      </div>
    </div>
  );
}
