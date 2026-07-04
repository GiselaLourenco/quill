"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl">Quill</h1>
        <p className="mb-6 mt-1 text-sm text-ink/70">
          Entre para voltar à sua estante.
        </p>
        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-md border-2 border-ink bg-white p-6 shadow-hard"
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded border-2 border-ink bg-paper px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Senha
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded border-2 border-ink bg-paper px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss"
            />
          </label>
          {state?.error && (
            <p className="text-sm font-medium text-coral">{state.error}</p>
          )}
          <button
            disabled={pending}
            type="submit"
            className="mt-2 rounded-md bg-moss px-4 py-2 font-display text-sm text-paper shadow-hard-sm disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-sm">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="font-medium text-navy underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
