"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveGoals } from "@/app/actions/goals";

export type MetaConfiguravel = {
  type: "books_per_year" | "hours_per_month" | "streak_days";
  label: string;
  unidade: string;
  atual: number;
  alvo: number;
  passo: number;
  max: number;
};

/**
 * Modal "Configurar metas": as três metas de uma vez, cada uma com stepper e o
 * progresso atual à direita. Alvo 0 desliga a meta.
 */
export function ConfigurarMetas({ metas }: { metas: MetaConfiguravel[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="shadow-hard w-full rounded-md border-2 border-ink bg-moss py-3.5 font-display text-sm uppercase tracking-wider text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        Configurar metas
      </button>

      {aberto && <ModalMetas metas={metas} onFechar={() => setAberto(false)} />}
    </>
  );
}

function ModalMetas({
  metas,
  onFechar,
}: {
  metas: MetaConfiguravel[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, number>>(() =>
    Object.fromEntries(metas.map((m) => [m.type, m.alvo])),
  );
  const [salvando, startSave] = useTransition();

  function ajustar(type: string, delta: number, passo: number, max: number) {
    setValores((v) => {
      const proximo = Math.max(0, Math.min(max, (v[type] ?? 0) + delta * passo));
      return { ...v, [type]: proximo };
    });
  }

  function salvar() {
    startSave(async () => {
      await saveGoals(metas.map((m) => ({ type: m.type, target: valores[m.type] ?? 0 })));
      router.refresh();
      onFechar();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="shadow-hard max-h-[88dvh] w-full max-w-[360px] overflow-y-auto rounded-2xl border-2 border-ink bg-card p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl uppercase leading-none tracking-tight text-ink">
            Configurar metas
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="-mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-2xl leading-none text-ink"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {metas.map((m) => {
            const alvo = valores[m.type] ?? 0;
            return (
              <div key={m.type} className="rounded-xl border-2 border-ink bg-paper p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="font-display text-sm uppercase tracking-tight text-ink">
                    {m.label}
                  </span>
                  <span className="shrink-0 font-serif text-xs italic text-ink-soft">
                    {alvo > 0 ? `${m.atual} / ${alvo} ${m.unidade}` : "desligada"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ajustar(m.type, -1, m.passo, m.max)}
                    aria-label={`Diminuir ${m.label}`}
                    className="h-12 w-12 shrink-0 rounded-lg border-2 border-ink bg-card font-display text-xl leading-none text-ink active:translate-y-0.5"
                  >
                    −
                  </button>
                  <label className="flex flex-1 cursor-text items-center justify-center rounded-lg border-2 border-ink bg-card py-2.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={alvo}
                      onChange={(e) => {
                        const digitos = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setValores((v) => ({
                          ...v,
                          [m.type]: digitos === "" ? 0 : Math.min(m.max, Number(digitos)),
                        }));
                      }}
                      aria-label={`Alvo de ${m.label}`}
                      className="w-20 bg-transparent text-center font-display text-2xl leading-none text-ink focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => ajustar(m.type, 1, m.passo, m.max)}
                    aria-label={`Aumentar ${m.label}`}
                    className="h-12 w-12 shrink-0 rounded-lg border-2 border-ink bg-card font-display text-xl leading-none text-ink active:translate-y-0.5"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="shadow-hard mt-5 w-full rounded-xl border-2 border-ink bg-moss py-4 font-display text-base uppercase tracking-wider text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar metas"}
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-soft">
          Deixe em 0 para desligar uma meta.
        </p>
      </div>
    </div>
  );
}
