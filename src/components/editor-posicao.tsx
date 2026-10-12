"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  atualizarPosicaoLeitura,
  definirTotalEPosicao,
  type SessionUnit,
} from "@/app/actions/sessions";

type Props = {
  itemId: string;
  atual: number;
  total: number | null;
  unidade: SessionUnit;
};

function useEditorPosicao({ itemId, atual, unidade }: Omit<Props, "total">) {
  const router = useRouter();
  const [valor, setValor] = useState(String(atual));
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    const numero = valor.trim() === "" ? NaN : Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
      setErro("Número inválido.");
      return;
    }
    setErro(null);
    if (numero === atual) return;
    startTransition(async () => {
      const r = await atualizarPosicaoLeitura({ itemId, unidade, valor: numero });
      if (r.error) {
        setErro(r.error);
        setValor(String(atual));
        return;
      }
      // `atual` só muda quando o server component recarrega — sem isto, a
      // tela ficava mostrando a posição antiga até a próxima navegação.
      router.refresh();
    });
  }

  return { valor, setValor, salvar, pendente, erro };
}

/**
 * Sem total cadastrado ainda: nada pra comparar com a posição atual, então
 * pede os dois de uma vez (total é opcional deixar em branco a posição —
 * 0 é válido, "ainda não comecei").
 */
function useDefinirTotal({ itemId, unidade }: Omit<Props, "total" | "atual">) {
  const router = useRouter();
  const [total, setTotal] = useState("");
  const [atual, setAtual] = useState("");
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    const totalNum = Number(total);
    const atualNum = atual.trim() === "" ? 0 : Number(atual);
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      setErro("Informe o total.");
      return;
    }
    if (!Number.isFinite(atualNum) || atualNum < 0) {
      setErro("Número inválido.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const r = await definirTotalEPosicao({ itemId, unidade, total: totalNum, atual: atualNum });
      if (r.error) {
        setErro(r.error);
        return;
      }
      router.refresh();
    });
  }

  return { total, setTotal, atual, setAtual, salvar, pendente, erro };
}

/**
 * Páginas ocupando a linha inteira — é o dado mais usado (a maioria dos
 * livros tem página cadastrada, capítulo é a exceção), então ganha o
 * destaque e um botão explícito de salvar em vez do auto-save da versão
 * compacta.
 */
export function EditorPosicaoLinha({ itemId, atual, total, unidade }: Props) {
  const rotulo = unidade === "pages" ? "página" : "capítulo";
  const rotuloPlural = unidade === "pages" ? "páginas" : "capítulos";
  // Hook sempre chamado (regra dos hooks) — só não é usado no branch sem total.
  const { valor, setValor, salvar, pendente, erro } = useEditorPosicao({ itemId, atual, unidade });

  if (!total) {
    return <DefinirTotalLinha itemId={itemId} unidade={unidade} rotuloPlural={rotuloPlural} />;
  }

  return (
    <div className="border-2 border-ink bg-paper p-3 shadow-hard-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[10px] uppercase tracking-widest text-ink-soft">
            {rotuloPlural}
          </p>
          <p className="font-display text-lg text-ink">
            {atual} <span className="text-ink-soft">/ {total}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="shadow-hard-sm flex cursor-text items-center rounded-md border-2 border-ink bg-card px-2 py-1.5">
            <input
              type="text"
              inputMode="numeric"
              value={valor}
              disabled={pendente}
              onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, ""))}
              aria-label={`${rotulo} atual`}
              className="w-14 bg-transparent text-center font-display text-sm focus:outline-none disabled:opacity-60"
            />
          </label>
          <button
            type="button"
            onClick={salvar}
            disabled={pendente}
            className="shadow-hard-sm rounded-md border-2 border-ink bg-moss px-3 py-1.5 font-display text-[10px] uppercase tracking-widest text-paper disabled:opacity-60"
          >
            {pendente ? "…" : "Atualizar"}
          </button>
        </div>
      </div>
      {erro && <p className="mt-2 text-xs font-medium text-coral">{erro}</p>}
    </div>
  );
}

function DefinirTotalLinha({
  itemId,
  unidade,
  rotuloPlural,
}: {
  itemId: string;
  unidade: SessionUnit;
  rotuloPlural: string;
}) {
  const { total, setTotal, atual, setAtual, salvar, pendente, erro } = useDefinirTotal({
    itemId,
    unidade,
  });

  return (
    <div className="border-2 border-dashed border-ink/40 bg-paper p-3">
      <p className="font-display text-[10px] uppercase tracking-widest text-ink-soft">
        {rotuloPlural} — sem total cadastrado
      </p>
      <div className="mt-2 flex items-end gap-2">
        {/* Mesma ordem do modo já cadastrado (atual / total) — consistência
            entre os dois estados do editor. */}
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wide text-ink-soft">Atual</span>
          <input
            type="text"
            inputMode="numeric"
            value={atual}
            disabled={pendente}
            onChange={(e) => setAtual(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0"
            className="w-16 rounded-md border-2 border-ink bg-card px-2 py-1.5 text-center font-display text-sm placeholder:text-ink-soft/50 focus:outline-none disabled:opacity-60"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wide text-ink-soft">Total</span>
          <input
            type="text"
            inputMode="numeric"
            value={total}
            disabled={pendente}
            onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-16 rounded-md border-2 border-ink bg-card px-2 py-1.5 text-center font-display text-sm focus:outline-none disabled:opacity-60"
          />
        </label>
        <button
          type="button"
          onClick={salvar}
          disabled={pendente}
          className="shadow-hard-sm ml-auto rounded-md border-2 border-ink bg-moss px-3 py-1.5 font-display text-[10px] uppercase tracking-widest text-paper disabled:opacity-60"
        >
          {pendente ? "…" : "Salvar"}
        </button>
      </div>
      {erro && <p className="mt-2 text-xs font-medium text-coral">{erro}</p>}
    </div>
  );
}

/**
 * Um dos quadrados de stat — mesma ideia, só compacta: salva ao sair do
 * campo (não tem espaço pra um botão). Usada pra capítulo, que fica lado a
 * lado com os outros números.
 */
export function EditorPosicaoTile({ itemId, atual, total, unidade }: Props) {
  const rotulo = unidade === "pages" ? "Páginas" : "Capítulos";
  const rotuloSingular = unidade === "pages" ? "página atual" : "capítulo atual";
  const { valor, setValor, salvar, pendente } = useEditorPosicao({ itemId, atual, unidade });

  if (!total) {
    return <DefinirTotalTile itemId={itemId} unidade={unidade} rotulo={rotulo} />;
  }

  return (
    <div className="border-2 border-ink bg-paper py-3 text-center shadow-hard-sm">
      <div className="flex items-baseline justify-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={valor}
          disabled={pendente}
          onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={salvar}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label={rotuloSingular}
          className="w-9 border-b-2 border-ink bg-transparent text-center font-display text-base text-ink focus:outline-none disabled:opacity-60"
        />
        <span className="font-display text-base text-ink-soft">/{total}</span>
      </div>
      <div className="mt-0.5 text-[10.5px] uppercase tracking-wide text-ink-soft">{rotulo}</div>
    </div>
  );
}

/**
 * Sem espaço pra dois campos aqui — pede só o total (posição atual entra
 * como 0). Salvo o total, o quadrado passa a ser o normal, editável.
 */
function DefinirTotalTile({
  itemId,
  unidade,
  rotulo,
}: {
  itemId: string;
  unidade: SessionUnit;
  rotulo: string;
}) {
  const router = useRouter();
  const [total, setTotal] = useState("");
  const [pendente, startTransition] = useTransition();

  function salvar() {
    const numero = Number(total);
    if (!Number.isFinite(numero) || numero <= 0) return;
    startTransition(async () => {
      await definirTotalEPosicao({ itemId, unidade, total: numero, atual: 0 });
      router.refresh();
    });
  }

  return (
    <div className="border-2 border-dashed border-ink/40 bg-paper py-3 text-center">
      <input
        type="text"
        inputMode="numeric"
        value={total}
        disabled={pendente}
        onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={salvar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="total"
        aria-label={`Total de ${rotulo.toLowerCase()}`}
        className="w-16 border-b-2 border-ink bg-transparent text-center font-display text-base text-ink placeholder:text-ink-soft/50 focus:outline-none disabled:opacity-60"
      />
      <div className="mt-0.5 text-[10.5px] uppercase tracking-wide text-ink-soft">{rotulo}</div>
    </div>
  );
}
