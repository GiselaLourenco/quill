"use client";

import { useState } from "react";
import { createGoal } from "@/app/actions/goals";
import { GOAL_TYPES } from "@/lib/gamification";

export function GoalForm() {
  const [type, setType] = useState<string>(GOAL_TYPES[0].value);

  return (
    <form
      action={createGoal}
      className="flex flex-col gap-3 rounded-md border-2 border-dashed border-cover-border p-4"
    >
      <span className="text-sm font-medium">Nova meta</span>
      <select
        name="type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="rounded border-2 border-ink bg-white px-3 py-2 text-sm"
      >
        {GOAL_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <div className="flex min-w-0 gap-2">
        <input
          type="number"
          name="target_value"
          required
          min={1}
          placeholder="Valor alvo"
          className="min-w-0 flex-1 rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
        {type === "pages_in_period" && (
          <input
            type="date"
            name="period_end"
            required
            className="min-w-0 flex-1 rounded border-2 border-ink bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
          />
        )}
      </div>
      <button
        type="submit"
        className="rounded-md border-2 border-ink bg-moss-dark px-4 py-2.5 font-display text-sm text-paper shadow-hard-sm"
      >
        Criar meta
      </button>
    </form>
  );
}
