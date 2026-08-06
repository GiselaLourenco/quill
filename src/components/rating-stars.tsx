"use client";

import { useState, useTransition } from "react";
import { setRating } from "@/app/actions/ratings";

// Seletor de nota por estrelas. Otimista: pinta na hora, salva em background.
// Toca de novo na mesma estrela pra limpar a nota.
export function RatingStars({
  itemId,
  initialStars,
}: {
  itemId: string;
  initialStars: number;
}) {
  const [stars, setStars] = useState(initialStars);
  const [hover, setHover] = useState(0);
  const [, startSave] = useTransition();

  function choose(value: number) {
    const next = value === stars ? 0 : value;
    setStars(next);
    startSave(() => setRating(itemId, next));
  }

  const shown = hover || stars;

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex gap-1"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
        aria-label="Sua nota"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => choose(n)}
            className="text-2xl leading-none transition-transform hover:scale-110"
          >
            <span className={n <= shown ? "text-mustard" : "text-ink/25"}>★</span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-ink/55">
        {stars > 0
          ? "toque de novo na mesma estrela pra limpar"
          : "vale a qualquer momento — até sem terminar"}
      </p>
    </div>
  );
}
