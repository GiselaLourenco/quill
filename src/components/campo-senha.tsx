"use client";

import { useState } from "react";

/**
 * Campo de senha com olho pra revelar o que foi digitado.
 *
 * Nasceu na tela de redefinir senha e virou compartilhado quando login e
 * cadastro também precisaram — os dois `tom` existem porque essas telas foram
 * desenhadas em momentos diferentes e ainda não têm a mesma caixa de texto.
 *
 * O botão começa em "mostrar": a senha só aparece se a pessoa pedir.
 */
export function CampoSenha({
  id,
  label,
  name,
  autoComplete,
  placeholder = "••••••••",
  minLength,
  required = true,
  erro,
  tom = "alto",
}: {
  id: string;
  label: string;
  name: string;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  erro?: boolean;
  tom?: "alto" | "compacto";
}) {
  const [visivel, setVisivel] = useState(false);
  const alto = tom === "alto";

  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className={alto ? "text-sm font-semibold text-ink" : "text-sm font-medium"}>
        {label}
      </span>
      <div
        className={`flex items-center gap-2 bg-paper ${
          alto ? "rounded-xl border-2 px-4 py-3" : "rounded border-2 px-3 py-2"
        } ${
          erro ? "border-coral" : alto ? "border-ink/80" : "border-ink"
        } ${alto ? "focus-within:border-ink" : "focus-within:ring-2 focus-within:ring-moss-dark"}`}
      >
        <input
          id={id}
          name={name}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          className={`w-full bg-transparent text-ink placeholder:text-ink-soft/60 focus:outline-none ${
            alto ? "text-[15px]" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="shrink-0 text-ink-soft hover:text-ink"
        >
          {visivel ? <OlhoFechado /> : <Olho />}
        </button>
      </div>
    </label>
  );
}

function Olho() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function OlhoFechado() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3 21 21" />
      <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.5 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
