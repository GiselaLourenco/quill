"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { login, resetPassword } from "@/app/actions/auth";

type Modo = "login" | "recuperar" | "enviado";

export default function LoginPage() {
  const [modo, setModo] = useState<Modo>("login");
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);
  const [resetState, resetAction, resetPending] = useActionState(resetPassword, undefined);

  useEffect(() => {
    if (resetState?.error === "enviado") setModo("enviado");
  }, [resetState]);

  const tagline =
    modo === "recuperar"
      ? "a gente te ajuda a voltar."
      : modo === "enviado"
      ? "confere sua caixa de entrada."
      : "sua leitura, viva.";

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-6 pb-10 pt-14">

        {/* Mascote + wordmark */}
        <header className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/img/mascot/quill-confiante.webp"
            alt=""
            aria-hidden
            width={128}
            height={128}
            className="select-none"
            draggable={false}
            priority
          />
          <h1 className="font-display text-6xl leading-none tracking-tight text-ink">
            Quill
          </h1>
          <p className="font-serif text-[17px] italic text-ink-soft">{tagline}</p>
        </header>

        {/* ── Login ── */}
        {modo === "login" && (
          <form action={loginAction} className="mt-10 flex flex-col gap-4">
            <Field id="email" label="E-mail" type="email" name="email" autoComplete="email" placeholder="voce@email.com" />
            <Field id="password" label="Senha" type="password" name="password" autoComplete="current-password" placeholder="••••••••" />

            {loginState?.error && (
              <p className="text-sm font-medium text-coral">{loginState.error}</p>
            )}

            <button
              type="button"
              onClick={() => setModo("recuperar")}
              className="-mt-1 self-end text-[13px] font-semibold text-ink-soft underline underline-offset-4 hover:text-coral"
            >
              Esqueci minha senha
            </button>

            <button
              type="submit"
              disabled={loginPending}
              className="shadow-hard mt-1 w-full rounded-xl border-2 border-ink bg-coral px-4 py-3.5 font-display text-base tracking-wide text-ink transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-hard-sm disabled:opacity-60"
            >
              {loginPending ? "Entrando…" : "Entrar"}
            </button>
          </form>
        )}

        {/* ── Recuperar senha ── */}
        {modo === "recuperar" && (
          <form action={resetAction} className="mt-10 flex flex-col gap-5">
            <div className="shadow-hard rounded-md border-2 border-ink bg-card p-5">
              <p className="mb-4 text-sm leading-relaxed text-ink">
                Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.
              </p>
              <Field id="email-reset" label="E-mail" type="email" name="email" autoComplete="email" placeholder="voce@email.com" />
            </div>

            {resetState?.error && resetState.error !== "enviado" && (
              <p className="text-sm font-medium text-coral">{resetState.error}</p>
            )}

            <button
              type="submit"
              disabled={resetPending}
              className="shadow-hard w-full rounded-md border-2 border-ink bg-coral px-4 py-3.5 font-display text-base tracking-wide text-ink transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-hard-sm disabled:opacity-60"
            >
              {resetPending ? "Enviando…" : "Enviar link"}
            </button>

            <button
              type="button"
              onClick={() => setModo("login")}
              className="text-center text-sm font-semibold text-ink underline underline-offset-4 hover:text-coral"
            >
              ← Voltar para o login
            </button>
          </form>
        )}

        {/* ── E-mail enviado ── */}
        {modo === "enviado" && (
          <div className="mt-10 flex flex-col gap-6">
            <div className="shadow-hard rounded-md border-2 border-ink bg-card p-5">
              <p className="text-sm leading-relaxed text-ink">
                Se existir uma conta com esse e-mail, você vai receber um link para
                redefinir a senha em alguns minutos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModo("login")}
              className="shadow-hard w-full rounded-md border-2 border-ink bg-mustard px-4 py-3.5 font-display text-base tracking-wide text-ink transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-hard-sm"
            >
              Voltar para o login
            </button>
          </div>
        )}

        {/* Criar conta */}
        {modo === "login" && (
          <p className="mt-5 text-center text-sm font-semibold text-ink">
            Primeira vez aqui?{" "}
            <Link href="/signup" className="text-coral underline underline-offset-4 hover:text-ink">
              Criar conta
            </Link>
          </p>
        )}

        <div className="mt-6 flex justify-center" aria-hidden>
          <ZigZag />
        </div>

        <p className="mt-auto pt-10 text-center text-[11px] text-ink-soft">
          Quill · app de leitura
        </p>
      </div>
    </div>
  );
}

function Field({
  id, label, type, name, placeholder, autoComplete,
}: {
  id: string; label: string; type: "email" | "password"; name: string;
  placeholder?: string; autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border-2 border-ink/80 bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none"
      />
    </label>
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
