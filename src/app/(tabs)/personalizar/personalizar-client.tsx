"use client";

import { useState } from "react";
import { updateMetricsPrefs } from "@/app/actions/pills";
import { PILL_CATALOG, MAX_PILLS, type PillKey } from "@/lib/pills";

/**
 * Escolha das pílulas do painel.
 *
 * O catálogo é maior que o painel, então o limite precisa aparecer ANTES de a
 * pessoa marcar a sétima e levar um erro depois de salvar: ao bater o teto, as
 * não marcadas ficam desabilitadas e o contador explica por quê.
 */
export function PersonalizarClient({ inicial }: { inicial: PillKey[] }) {
  const [escolhidas, setEscolhidas] = useState<PillKey[]>(inicial);
  const cheio = escolhidas.length >= MAX_PILLS;

  function alternar(key: PillKey) {
    setEscolhidas((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  return (
    <form action={updateMetricsPrefs} className="flex flex-col gap-3">
      <p
        className={`text-sm font-semibold ${cheio ? "text-coral" : "text-ink-soft"}`}
        role="status"
      >
        {escolhidas.length} de {MAX_PILLS} escolhidas
        {cheio ? " — desmarque uma pra trocar" : ""}
      </p>

      {PILL_CATALOG.map((pill) => {
        const marcada = escolhidas.includes(pill.key);
        const bloqueada = cheio && !marcada;
        return (
          <label
            key={pill.key}
            className={`flex items-center gap-3 rounded-md border-2 px-3 py-2.5 ${
              marcada ? "border-ink bg-card" : "border-cover-border"
            } ${bloqueada ? "opacity-45" : ""}`}
          >
            <input
              type="checkbox"
              name="pills"
              value={pill.key}
              checked={marcada}
              disabled={bloqueada}
              onChange={() => alternar(pill.key)}
              className="h-4 w-4 accent-moss-dark"
            />
            <span className="text-sm">{pill.label}</span>
          </label>
        );
      })}

      <button
        type="submit"
        disabled={escolhidas.length === 0}
        className="mt-3 rounded-md border-2 border-ink bg-moss-dark px-4 py-2.5 font-display text-sm text-paper shadow-hard-sm disabled:opacity-60"
      >
        Salvar
      </button>
      {escolhidas.length === 0 && (
        <p className="text-xs text-ink-soft">
          Escolha pelo menos uma — o painel não fica vazio.
        </p>
      )}
    </form>
  );
}
