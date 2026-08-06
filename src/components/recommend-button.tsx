"use client";

import { useState, useTransition } from "react";
import type { Friend } from "@/lib/friends";
import { recommendBook } from "@/app/actions/recommendations";

// Botão "Indicar para alguém" → abre um seletor de amigos → grava a indicação.
export function RecommendButton({
  friends,
  itemRef,
  title,
}: {
  friends: Friend[];
  itemRef: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isSending, startSend] = useTransition();

  function send(friend: Friend) {
    startSend(async () => {
      await recommendBook({ toUserId: friend.id, itemRef, title });
      setSentTo(friend.name);
      setOpen(false);
    });
  }

  if (sentTo) {
    return (
      <p className="rounded-md border-2 border-moss-dark bg-moss-dark/10 px-4 py-3 text-center text-sm font-medium">
        Indicado para {sentTo} ✓
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={friends.length === 0}
        className="w-full rounded-md border-2 border-ink bg-coral px-4 py-3 font-display text-sm text-paper shadow-hard disabled:opacity-50"
      >
        {friends.length === 0 ? "Sem amigos para indicar ainda" : "Indicar para alguém"}
      </button>
    );
  }

  return (
    <div className="rounded-md border-2 border-ink bg-white p-3">
      <p className="mb-2 text-sm font-medium">Indicar para quem?</p>
      <ul className="flex flex-col gap-1.5">
        {friends.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => send(f)}
              disabled={isSending}
              className="flex w-full items-center gap-2 rounded border-2 border-cover-border px-3 py-2 text-left text-sm disabled:opacity-50"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-mustard text-[11px] font-semibold uppercase">
                {f.name.charAt(0)}
              </span>
              {f.name}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 w-full text-center text-xs text-ink/60"
      >
        cancelar
      </button>
    </div>
  );
}
