"use client";

import { useState, useTransition } from "react";
import { publishSession, saveSessionMemory } from "@/app/actions/sessions";
import type { ActiveChallenge } from "@/lib/challenges";
import { SCORING_METRIC_OPTIONS } from "@/lib/challenges";

type Book = { id: string; title: string };

function metricLabel(metric: string) {
  return (
    SCORING_METRIC_OPTIONS.find((o) => o.value === metric)?.label.toLowerCase() ??
    metric
  );
}

// Tela pós-sessão (passo 2 do fluxo de encerramento): celebração + duas seções
// opcionais — "Pra não esquecer" (vira comentário do livro) e
// "Publicar nos desafios" (só renderiza pra quem participa de algum).
export function PostSession({
  sessionId,
  book,
  durationSeconds,
  quantity,
  unit,
  challenges,
  onDone,
}: {
  sessionId: string;
  book: Book | null;
  durationSeconds: number;
  quantity: number | null;
  unit: "chapters" | "pages";
  challenges: ActiveChallenge[];
  onDone: () => void;
}) {
  const [memoryText, setMemoryText] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(challenges.map((c) => c.id)),
  );
  const [pagesExtra, setPagesExtra] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [isSaving, startSave] = useTransition();

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  const checkedChallenges = challenges.filter((c) => checked.has(c.id));
  // Convite gentil: só quando marcou capítulos e algum desafio marcado
  // pontua por páginas (e há livro pra ancorar a posição).
  const needsPages =
    unit === "chapters" &&
    book != null &&
    checkedChallenges.some((c) => c.scoring_metric === "pages");

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDone() {
    startSave(async () => {
      if (book && memoryText.trim()) {
        await saveSessionMemory({
          itemId: book.id,
          text: memoryText,
          isPublic,
        });
      }
      const groupIds = [...checked];
      if (groupIds.length > 0) {
        await publishSession({
          sessionId,
          itemId: book?.id ?? null,
          groupIds,
          note: showNote ? note : null,
          pagesExtra: needsPages && pagesExtra ? Number(pagesExtra) : null,
        });
      }
      onDone();
    });
  }

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
      <div className="mb-5 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="mt-1 font-serif text-xl font-semibold">Sessão salva!</h2>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs font-medium">
          <span className="rounded-full border-2 border-ink bg-white px-3 py-1">
            ⏱ {minutes} min
          </span>
          {quantity != null && quantity > 0 && (
            <span className="rounded-full border-2 border-ink bg-white px-3 py-1">
              📖 {quantity} {unit === "chapters" ? "capítulos" : "páginas"}
            </span>
          )}
          {book && (
            <span className="rounded-full border-2 border-ink bg-white px-3 py-1">
              {book.title}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-ink/60">
          tudo abaixo é opcional — pode concluir direto ✌️
        </p>
      </div>

      {book && (
        <section className="mb-4 rounded-md border-2 border-cover-border bg-white p-4">
          <h3 className="font-serif text-base font-semibold">Pra não esquecer 🪶</h3>
          <p className="mb-2 text-xs text-ink/60">vai pra página de {book.title}</p>
          <textarea
            value={memoryText}
            onChange={(e) => setMemoryText(e.target.value)}
            placeholder="anota aquela frase, ideia ou sentimento…"
            rows={3}
            className="block w-full resize-none rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
          />
          <div className="mt-3 flex items-center justify-between border-t-2 border-dashed border-cover-border pt-2.5">
            <span className="text-xs font-semibold">Quem pode ver</span>
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <span className={isPublic ? "text-ink/50" : ""}>🔒 só eu</span>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                aria-label="Visível para amigos"
                onClick={() => setIsPublic((v) => !v)}
                className={`relative h-6 w-11 rounded-full border-2 border-ink ${isPublic ? "bg-moss" : "bg-white"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full border border-ink bg-white transition-all ${isPublic ? "right-0.5" : "left-0.5"}`}
                />
              </button>
              <span className={isPublic ? "" : "text-ink/50"}>🌍 amigos</span>
            </div>
          </div>
        </section>
      )}

      {challenges.length > 0 && (
        <section className="mb-4 rounded-md border-2 border-navy bg-white p-4">
          <h3 className="font-serif text-base font-semibold">
            Publicar nos desafios
          </h3>
          <p className="mb-1 text-xs text-ink/60">
            já vêm marcados — desmarque se não quiser · vale mais de um
          </p>
          <ul>
            {challenges.map((c) => (
              <li
                key={c.id}
                className="border-b border-dashed border-cover-border py-2.5 last:border-b-0"
              >
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="mt-0.5 h-4.5 w-4.5 accent-moss-dark"
                  />
                  <span className={checked.has(c.id) ? "" : "opacity-60"}>
                    <span className="block text-sm font-semibold">
                      {c.emoji} {c.name}
                    </span>
                    <span className="block text-xs text-ink/60">
                      pontua por {metricLabel(c.scoring_metric)}
                    </span>
                  </span>
                </label>
                {needsPages &&
                  c.scoring_metric === "pages" &&
                  checked.has(c.id) && (
                    <div className="mt-2 rounded border-2 border-dashed border-cover-border bg-paper px-3 py-2">
                      <label className="text-xs font-medium">
                        você marcou capítulos — quantas páginas foram?
                        <input
                          type="number"
                          min={0}
                          value={pagesExtra}
                          onChange={(e) => setPagesExtra(e.target.value)}
                          className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
                        />
                      </label>
                    </div>
                  )}
              </li>
            ))}
          </ul>
          {checkedChallenges.length > 0 &&
            (showNote ? (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="sua nota — entra como comentário no seu registro"
                rows={2}
                className="mt-2 block w-full resize-none rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                className="mt-2 w-full rounded border-2 border-ink bg-white px-3 py-2 text-xs font-semibold"
              >
                ✍️ escrever nota
              </button>
            ))}
        </section>
      )}

      <button
        type="button"
        onClick={handleDone}
        disabled={isSaving}
        className="w-full rounded-md border-2 border-ink bg-coral px-4 py-3 font-display text-sm text-paper shadow-hard disabled:opacity-60"
      >
        {isSaving ? "Salvando…" : "Concluir"}
      </button>
    </main>
  );
}
