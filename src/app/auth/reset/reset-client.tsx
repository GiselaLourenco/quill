"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AppImage } from "@/components/app-image";
import { ZigZag } from "@/components/zig-zag";
import { updatePassword } from "@/app/actions/auth";
import { CampoSenha } from "@/components/campo-senha";

type Estado = "form" | "sucesso" | "expirado";

export function ResetClient({ linkValido }: { linkValido: boolean }) {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  const estado: Estado =
    state && "ok" in state
      ? "sucesso"
      : !linkValido || (state && "error" in state && state.error === "expirado")
      ? "expirado"
      : "form";

  const erro = state && "error" in state && state.error !== "expirado" ? state : null;

  const mascote =
    estado === "sucesso"
      ? { slot: "reset.mascote-sucesso", src: "/img/mascot/quill-comemorando.webp" }
      : estado === "expirado"
      ? { slot: "reset.mascote-expirado", src: "/img/mascot/quill-explorando.webp" }
      : { slot: "reset.mascote-form", src: "/img/mascot/quill-escrevendo.webp" };

  const tagline =
    estado === "sucesso"
      ? "senha nova, tudo certo."
      : estado === "expirado"
      ? "esse link já venceu."
      : "quase lá.";

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-6 pb-10 pt-14">

        {/* Mascote + wordmark */}
        <header className="flex flex-col items-center gap-3 text-center">
          <AppImage
            slot={mascote.slot}
            src={mascote.src}
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

        {/* ── Nova senha ── */}
        {estado === "form" && (
          <form action={action} className="mt-10 flex flex-col gap-5">
            <div className="shadow-hard rounded-md border-2 border-ink bg-card p-5">
              <p className="mb-4 text-sm leading-relaxed text-ink">
                Escolha uma senha nova pra sua conta.
              </p>
              <CampoSenha
                id="password"
                label="Nova senha"
                name="password"
                autoComplete="new-password"
                erro={erro?.campo === "senha"}
              />
              <p className="mt-1.5 text-[13px] text-ink-soft">
                Mínimo de 8 caracteres.
              </p>
              <div className="mt-4">
                <CampoSenha
                  id="password-confirm"
                  label="Confirmar nova senha"
                  name="password-confirm"
                  autoComplete="new-password"
                  erro={erro?.campo === "confirmar"}
                />
              </div>
            </div>

            {erro && <p className="text-sm font-medium text-coral">{erro.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="shadow-hard w-full rounded-md border-2 border-ink bg-coral px-4 py-3.5 font-display text-base tracking-wide text-ink transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-hard-sm disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Salvar nova senha"}
            </button>

            <Link
              href="/login"
              className="text-center text-sm font-semibold text-ink underline underline-offset-4 hover:text-coral"
            >
              ← Voltar para o login
            </Link>
          </form>
        )}

        {/* ── Senha alterada ── */}
        {estado === "sucesso" && (
          <div className="mt-10 flex flex-col gap-6">
            <div className="shadow-hard flex items-start gap-3 rounded-md border-2 border-ink bg-card p-5">
              <IconeOk />
              <p className="text-sm leading-relaxed text-ink">
                Sua senha foi trocada. Já pode entrar com ela.
              </p>
            </div>
            <Link
              href="/login"
              className="shadow-hard w-full rounded-md border-2 border-ink bg-mustard px-4 py-3.5 text-center font-display text-base tracking-wide text-ink transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-hard-sm"
            >
              Entrar no Quill
            </Link>
          </div>
        )}

        {/* ── Link expirado ou inválido ── */}
        {estado === "expirado" && (
          <div className="mt-10 flex flex-col gap-5">
            <div className="shadow-hard flex items-start gap-3 rounded-md border-2 border-ink bg-card p-5">
              <IconeExpirado />
              <p className="text-sm leading-relaxed text-ink">
                O link de redefinição expira em 1 hora e só funciona uma vez.
                Peça um novo pra continuar.
              </p>
            </div>
            <Link
              href="/login?recuperar=1"
              className="shadow-hard w-full rounded-md border-2 border-ink bg-coral px-4 py-3.5 text-center font-display text-base tracking-wide text-ink transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-hard-sm"
            >
              Pedir um novo link
            </Link>
            <Link
              href="/login"
              className="text-center text-sm font-semibold text-ink underline underline-offset-4 hover:text-coral"
            >
              ← Voltar para o login
            </Link>
          </div>
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

function IconeOk() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-moss" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

function IconeExpirado() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-coral" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.5 14.3A8.5 8.5 0 1 0 13.2 20.5" />
      <path d="M12 7.5V12l2.5 1.5" />
      <path d="m17 17 4 4m0-4-4 4" />
    </svg>
  );
}
