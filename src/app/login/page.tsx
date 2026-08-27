"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import type { FormEvent } from "react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-6 pb-10 pt-14">
        {/* Marca: wordmark + tagline */}
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-6xl leading-none tracking-tight text-ink">
            Quill
          </h1>
          <p className="font-serif text-[17px] italic text-ink-soft">
            sua leitura, viva.
          </p>
        </header>

        {/* Formulário */}
        <form action={formAction} className="mt-10 flex flex-col gap-4">
          <label htmlFor="email" className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">E-mail</span>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@email.com"
              className="w-full rounded-xl border-2 border-ink/80 bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none"
            />
          </label>
          <label htmlFor="password" className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Senha</span>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border-2 border-ink/80 bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none"
            />
          </label>

          {state?.error && (
            <p className="text-sm font-medium text-coral">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="shadow-hard mt-3 w-full rounded-xl border-2 border-ink bg-coral px-4 py-3.5 font-display text-base tracking-wide text-ink transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-hard-sm disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        {/* Criar conta */}
        <p className="mt-5 text-center text-sm font-semibold text-ink">
          Primeira vez aqui?{" "}
          <Link
            href="/signup"
            className="text-coral underline underline-offset-4 hover:text-ink"
          >
            Criar conta
          </Link>
        </p>

        {/* Zigue-zague decorativo */}
        <div className="mt-6 flex justify-center" aria-hidden="true">
          <ZigZag />
        </div>

        <p className="mt-auto pt-10 text-center text-[11px] text-ink-soft">
          Quill · app de leitura
        </p>
      </div>
    </div>
  );
}

function ZigZag() {
  return (
    <svg viewBox="0 0 180 12" className="h-3 w-40">
      <path
        d="M0 6 L12 1 L24 11 L36 1 L48 11 L60 1 L72 11 L84 1 L96 11 L108 1 L120 11 L132 1 L144 11 L156 1 L168 11 L180 6"
        fill="none"
        stroke="var(--color-mustard)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
