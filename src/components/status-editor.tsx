"use client";

import { useTransition } from "react";
import { toggleRecommended, updateItemStatus } from "@/app/actions/media-items";

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
  const recomendado = isRecommended || status === "recomendado";

  return (
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
            onClick={() =>
              startTransition(() =>
                ehMarca ? toggleRecommended(itemId) : updateItemStatus(itemId, opt.value),
              )
            }
            className={`rounded-full border-2 border-ink px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
              ativo ? (ehMarca ? "bg-navy text-paper" : "bg-mustard") : "bg-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
