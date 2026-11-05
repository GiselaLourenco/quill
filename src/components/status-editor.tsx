"use client";

import { ComSpinner } from "@/components/carregando";
import { useState, useTransition } from "react";
import { iniciarReleitura, toggleRecommended, updateItemStatus } from "@/app/actions/media-items";

const OPTIONS = [
  { value: "want", label: "quero ler" },
  { value: "reading", label: "lendo" },
  { value: "finished", label: "terminei" },
  { value: "recomendado", label: "recomendado" },
  { value: "abandoned", label: "abandonei" },
];

/**
 * "recomendado" funciona como marca, não como status exclusivo: um livro
 * indicado pode estar recomendado E quero ler (ou lendo, terminei…). Tocar nele
 * liga/desliga a marca; tocar num dos outros troca o status de leitura sem
 * apagar a recomendação.
 *
 * Livro terminado indo pra "lendo" pergunta antes: releitura (a leitura
 * terminada fica guardada e continua contando) ou correção de um "terminei"
 * marcado por engano (apaga a data, como sempre foi).
 */
export function StatusEditor({
  itemId,
  status,
  isRecommended,
}: {
  itemId: string;
  status: string;
  isRecommended: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  // Qual chip foi tocado — o spinner aparece só nele, não em todos.
  const [clicado, setClicado] = useState<string | null>(null);
  const recomendado = isRecommended || status === "recomendado";
  const [perguntaReler, setPerguntaReler] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function reler() {
    setClicado("reading");
    setErro(null);
    startTransition(async () => {
      const r = await iniciarReleitura(itemId);
      if (r.error) setErro(r.error);
      else setPerguntaReler(false);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Status do livro">
        {OPTIONS.map((opt) => {
          const ehMarca = opt.value === "recomendado";
          const ativo = ehMarca ? recomendado : status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isPending}
              aria-pressed={ativo}
              onClick={() => {
                if (!ehMarca && status === "finished" && opt.value === "reading") {
                  setPerguntaReler((p) => !p);
                  return;
                }
                setPerguntaReler(false);
                setClicado(opt.value);
                startTransition(() =>
                  ehMarca ? toggleRecommended(itemId) : updateItemStatus(itemId, opt.value),
                );
              }}
              className={`rounded-full border-2 border-ink px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                ativo ? (ehMarca ? "bg-navy text-paper" : "bg-mustard") : "bg-white"
              }`}
            >
              <ComSpinner ocupado={isPending && clicado === opt.value}>{opt.label}</ComSpinner>
            </button>
          );
        })}
      </div>

      {perguntaReler && (
        <div className="flex flex-col gap-2.5 rounded-md border-2 border-ink bg-card p-3">
          <p className="text-[13px] font-semibold text-ink">Você vai reler este livro?</p>
          <p className="text-[12px] leading-snug text-ink-soft">
            Numa releitura, a leitura que você terminou fica guardada e continua contando. A
            página volta pro começo.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={reler}
              className="rounded-md border-2 border-ink bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper shadow-[2px_2px_0_0_var(--color-coral)] disabled:opacity-50"
            >
              <ComSpinner ocupado={isPending && clicado === "reading"}>Começar releitura</ComSpinner>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setPerguntaReler(false);
                setClicado("corrigir");
                startTransition(() => updateItemStatus(itemId, "reading"));
              }}
              className="rounded-md border-2 border-ink bg-card px-3 py-1.5 text-[12px] font-semibold text-ink disabled:opacity-50"
            >
              Não terminei, corrigir
            </button>
          </div>
          {erro && <p className="text-[12px] font-medium text-coral">{erro}</p>}
        </div>
      )}
    </div>
  );
}
