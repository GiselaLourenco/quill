"use client";

import { useState } from "react";
import Link from "next/link";
import { ConquistaIcone, ConquistaSheet, BarraProgresso } from "@/components/conquista-sheet";
import { NIVEIS, NIVEL_COR, NIVEL_NOME, type ConquistaView } from "@/lib/conquistas";

type Filtro = "todas" | "feitas" | "faltam";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "feitas", rotulo: "Desbloqueadas" },
  { id: "faltam", rotulo: "Faltam" },
];

export function ConquistasClient({
  conquistas,
  abertaInicial,
}: {
  conquistas: ConquistaView[];
  abertaInicial: string | null;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [aberta, setAberta] = useState<string | null>(abertaInicial);
  const detalhe = conquistas.find((c) => c.id === aberta) ?? null;
  const feitas = conquistas.filter((c) => c.desbloqueada).length;

  return (
    <div className="flex-1 bg-paper px-5 pb-24 pt-6 text-ink">
      <header className="flex items-center gap-3">
        <Link
          href="/profile"
          aria-label="Voltar ao perfil"
          className="shadow-hard-sm flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-card text-lg font-bold transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ←
        </Link>
        <h1 className="font-display text-xl uppercase tracking-tight">Conquistas</h1>
        <span className="ml-auto text-sm font-bold tabular-nums">
          {feitas}/{conquistas.length}
        </span>
      </header>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar conquistas">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={`rounded-full border-2 border-ink px-3 py-1 text-[11px] font-bold uppercase ${
              filtro === f.id ? "bg-ink text-paper" : "bg-card"
            }`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {NIVEIS.map((nivel) => {
        const doNivel = conquistas.filter((c) => c.nivel === nivel);
        const visiveis = doNivel.filter(
          (c) => filtro === "todas" || (filtro === "feitas") === c.desbloqueada,
        );
        if (visiveis.length === 0) return null;
        return (
          <section key={nivel}>
            <div className="mb-2.5 mt-6 flex items-center gap-2">
              <span
                className="rounded-full border-[1.5px] border-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: NIVEL_COR[nivel] }}
              >
                {NIVEL_NOME[nivel]}
              </span>
              <span className="ml-auto text-[11px] font-bold tabular-nums text-ink-soft">
                {doNivel.filter((c) => c.desbloqueada).length}/{doNivel.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-x-2.5 gap-y-4">
              {visiveis.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAberta(c.id)}
                  className="group flex flex-col items-center gap-1.5 text-center"
                >
                  <span className="relative">
                    <ConquistaIcone
                      c={c}
                      tamanho={82}
                      className={`transition-all ${
                        c.desbloqueada
                          ? "shadow-[3px_3px_0_0_var(--color-ink)] group-active:translate-x-[2px] group-active:translate-y-[2px] group-active:shadow-none"
                          : ""
                      }`}
                    />
                    {c.desbloqueada && (
                      <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-ink bg-moss text-[11px] font-bold text-white">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold leading-tight [text-wrap:balance]">{c.titulo}</span>
                  {!c.desbloqueada &&
                    (c.alvo > 1 ? (
                      <>
                        <span className="w-[70px]">
                          <BarraProgresso c={c} fina />
                        </span>
                        <span className="text-[9.5px] font-bold tabular-nums text-ink-soft">
                          {c.progresso}/{c.alvo} {c.unidade}
                        </span>
                      </>
                    ) : (
                      <span className="text-[9.5px] font-bold text-ink-soft">ainda não</span>
                    ))}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {filtro === "feitas" && feitas === 0 && (
        <p className="mt-12 text-center font-serif text-sm italic text-ink-soft">
          Nenhuma ainda — a primeira sessão de leitura já destrava uma.
        </p>
      )}
      {filtro === "faltam" && feitas === conquistas.length && (
        <p className="mt-12 text-center font-serif text-sm italic text-ink-soft">
          Você fez todas. Todas!
        </p>
      )}

      {detalhe && <ConquistaSheet c={detalhe} onClose={() => setAberta(null)} />}
    </div>
  );
}
