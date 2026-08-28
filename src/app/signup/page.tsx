"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/actions/auth";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl">Quill</h1>
        <p className="mb-6 mt-1 text-sm text-ink/70">
          Crie sua conta para montar sua estante.
        </p>
        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-md border-2 border-ink bg-white p-6 shadow-hard"
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nome de usuário
            <input
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_.]+"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              placeholder="comoquerserchamada"
              className="rounded border-2 border-ink bg-paper px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-mustard"
            />
          </label>
          <p className="-mt-2 text-xs text-ink/60">
            É o nome que aparece no seu perfil e para os amigos.
          </p>
          <label className="flex flex-col gap-1 text-sm font-medium">
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded border-2 border-ink bg-paper px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mustard"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Senha
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded border-2 border-ink bg-paper px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mustard"
            />
          </label>
          <p className="-mt-2 text-xs text-ink/60">Pelo menos 8 caracteres.</p>
          {state?.error && (
            <p role="alert" className="text-sm font-medium text-coral">
              {state.error}
            </p>
          )}
          {state?.sucesso && (
            <p
              role="status"
              className="rounded border-2 border-ink bg-mustard/30 px-3 py-2 text-sm font-medium text-ink"
            >
              {state.sucesso}
            </p>
          )}
          <button
            disabled={pending}
            type="submit"
            className="mt-2 rounded-md bg-mustard px-4 py-2 font-display text-sm text-ink shadow-hard-sm disabled:opacity-60"
          >
            {pending ? "Criando…" : "Criar conta"}
          </button>
        </form>
        <p className="mt-4 text-sm">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-navy underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
