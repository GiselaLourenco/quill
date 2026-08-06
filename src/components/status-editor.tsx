"use client";

import { useTransition } from "react";
import { updateItemStatus } from "@/app/actions/media-items";

const OPTIONS = [
  { value: "want", label: "quero ler" },
  { value: "reading", label: "lendo" },
  { value: "finished", label: "terminei" },
  { value: "recomendado", label: "recomendado" },
  { value: "abandoned", label: "abandonei" },
];

export function StatusEditor({
  itemId,
  status,
}: {
  itemId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status do livro">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={isPending}
          aria-pressed={status === opt.value}
          onClick={() => startTransition(() => updateItemStatus(itemId, opt.value))}
          className={`rounded-full border-2 border-ink px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
            status === opt.value ? "bg-mustard" : "bg-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
