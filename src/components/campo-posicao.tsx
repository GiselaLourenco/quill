"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  abrevUnidade,
  analisarPosicao,
  paginaDoPercentual,
  rotuloUnidade,
  type UnidadePosicao,
} from "@/lib/posicao";

/** Unidade do campo: "percent" mostra e recebe %, mas devolve páginas. */
export type UnidadeCampo = UnidadePosicao | "percent";

/** O que o campo devolve pra quem salva a sessão. */
export type EstadoPosicao = {
  /** Posição a gravar; null = nada informado nessa unidade. */
  posicao: number | null;
  /** "Já vinha lendo, estava na X" (primeira sessão do livro) — vira cadastro. */
  antes: number | null;
  /** Quanto conta nas métricas. */
  delta: number;
  terminaLivro: boolean;
  /** Motivo pra ainda não salvar (pergunta sem resposta, aviso sem confirmar). */
  bloqueio: string | null;
  /** Modo %: o que a pessoa digitou (posicao/antes já vêm em páginas). */
  percentual?: number | null;
  percentualAntes?: number | null;
};

export const ESTADO_POSICAO_VAZIO: EstadoPosicao = {
  posicao: null,
  antes: null,
  delta: 0,
  terminaLivro: false,
  bloqueio: null,
};

const limpar = (bruto: string) => {
  const s = bruto.replace(/[^0-9]/g, "");
  return s ? Math.min(9999, Number(s)) : null;
};

/**
 * "Onde você parou?": a pessoa informa a página (ou capítulo) atual e o campo
 * mostra a conta com a posição anterior. Cobre as regras combinadas em
 * 2026-11-04 — primeira sessão do livro pergunta se começou agora ou já vinha
 * lendo; número menor que o anterior e pulo improvável pedem confirmação;
 * chegar ao total avisa que o livro vai ser terminado.
 *
 * Quem usa remonta o campo (`key`) ao trocar de livro ou de unidade — o valor
 * inicial é a posição anterior daquele livro.
 *
 * Modo "percent" (só aba Ler, livro com total de páginas): a pessoa digita %,
 * a tela mostra %, mas toda a conta (avisos, quanto leu, fim do livro) é feita
 * nas páginas convertidas — é isso que o campo devolve e o servidor grava.
 */
export function CampoPosicao({
  unidade,
  anterior,
  total,
  minutos,
  variante,
  rotulo,
  topo,
  percentualAnterior = null,
  onChange,
}: {
  unidade: UnidadeCampo;
  /** Última posição registrada nessa unidade (modo %: em páginas); null = o livro nunca teve. */
  anterior: number | null;
  /** Modo %: a posição anterior em % — a digitada na última sessão, ou a convertida das páginas. */
  percentualAnterior?: number | null;
  /** Total da unidade (modo %: total de páginas, obrigatório). */
  total: number | null;
  /** Tempo da sessão — pro aviso de pulo improvável. */
  minutos: number;
  /** "ler": stepper grande da aba Ler. "checkin": campo compacto do Juntos. */
  variante: "ler" | "checkin";
  rotulo?: string;
  /** Aba Ler: o seletor Páginas/Caps, dentro da caixa do número. */
  topo?: ReactNode;
  onChange: (estado: EstadoPosicao) => void;
}) {
  const pct = unidade === "percent";
  const paginas: UnidadePosicao = unidade === "chapters" ? "chapters" : "pages";
  const primeira = anterior == null;
  // No modo % o valor digitado (e o "estava em X") é %; nos outros, a própria posição.
  const anteriorDigitado = pct ? (anterior == null ? null : (percentualAnterior ?? 0)) : anterior;
  const [valor, setValor] = useState<number | null>(
    variante === "ler" ? (anteriorDigitado ?? 0) : anteriorDigitado,
  );
  const [inicio, setInicio] = useState<"agora" | "antes" | null>(null);
  const [antes, setAntes] = useState<number | null>(null);
  const [confirmado, setConfirmado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const abrev = abrevUnidade(paginas);
  const comTotal = (n: number) =>
    pct ? Math.min(n, 100) : total != null && total > 0 ? Math.min(n, total) : n;
  // % → páginas. Manter o mesmo % da sessão anterior não pode virar "voltou
  // 2 páginas" por arredondamento: aí vale a página exata de antes.
  const emPaginas = (n: number) =>
    !pct ? n : anterior != null && n === anteriorDigitado ? anterior : paginaDoPercentual(n, total ?? 0);
  // "Você estava na pág. 48" / "Você estava em 7%".
  const na = (n: number) => (pct ? `em ${n}%` : `na ${abrev} ${n}`);

  const baseDigitada = primeira ? (inicio === "antes" ? (antes ?? 0) : 0) : anteriorDigitado!;
  const base = primeira ? (inicio === "antes" ? emPaginas(antes ?? 0) : 0) : anterior;
  const informado = valor != null && !(primeira && valor === 0);
  const analise =
    valor != null
      ? analisarPosicao({ unidade: paginas, anterior: base, valor: emPaginas(valor), total, minutos })
      : null;
  const fimDigitado = valor == null ? 0 : pct ? Math.min(valor, 100) : (analise?.fim ?? valor);
  // Na primeira sessão "voltar" não existe — parar antes de onde já estava é
  // erro de digitação, tratado como bloqueio e não como aviso.
  const voltouDoInicio = primeira && inicio === "antes" && analise != null && analise.fim < base;
  const alerta = analise && !primeira ? analise.alerta : analise?.alerta === "pulo" ? "pulo" : null;
  const chaveAlerta = analise && alerta ? `${alerta}:${base}:${analise.fim}` : null;
  const alertaPendente = chaveAlerta != null && confirmado !== chaveAlerta;

  let bloqueio: string | null = null;
  if (informado && primeira && inicio == null) {
    bloqueio = "Conte se você começou o livro agora ou já vinha lendo.";
  } else if (informado && voltouDoInicio) {
    bloqueio = `Onde você parou não pode ser antes ${pct ? `de ${baseDigitada}%` : `da ${abrev} ${base}`}.`;
  } else if (informado && alertaPendente) {
    bloqueio = "Confirme o aviso sobre onde você parou antes de salvar.";
  }

  const estado: EstadoPosicao = informado
    ? {
        posicao: analise!.fim,
        antes: primeira && inicio === "antes" && (antes ?? 0) > 0 ? emPaginas(antes!) : null,
        delta: analise!.delta,
        terminaLivro: analise!.terminaLivro,
        bloqueio,
        ...(pct && {
          percentual: fimDigitado,
          percentualAntes: primeira && inicio === "antes" && (antes ?? 0) > 0 ? antes : null,
        }),
      }
    : ESTADO_POSICAO_VAZIO;

  useEffect(() => {
    onChange(estado);
    // `estado` é recriado a cada render — as dependências são os campos dele.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    estado.posicao,
    estado.antes,
    estado.delta,
    estado.terminaLivro,
    estado.bloqueio,
    estado.percentual,
    estado.percentualAntes,
  ]);

  const passo = unidade === "pages" ? 5 : 1;
  const mostraConta = informado && analise && (!primeira || inicio != null) && !voltouDoInicio;
  const mostraPergunta = primeira && (variante === "ler" || informado);

  const pergunta = mostraPergunta && (
    <div className="rounded-md border-2 border-ink bg-card p-3">
      <p className="text-[13px] font-semibold text-ink">Primeira vez que você registra este livro.</p>
      <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="Quando você começou">
        <OpcaoInicio on={inicio === "agora"} onClick={() => setInicio("agora")}>
          Comecei agora
        </OpcaoInicio>
        <OpcaoInicio on={inicio === "antes"} onClick={() => setInicio("antes")}>
          Já vinha lendo{inicio === "antes" ? (pct ? ", estava em" : `, estava na ${abrev}`) : ""}
          {inicio === "antes" && (
            <input
              type="text"
              inputMode="numeric"
              value={antes ?? ""}
              placeholder="0"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const n = limpar(e.target.value);
                setAntes(n == null ? null : comTotal(n));
              }}
              aria-label={`${pct ? "Porcentagem" : unidade === "pages" ? "Página" : "Capítulo"} em que você estava antes desta sessão`}
              className="ml-auto w-16 rounded-sm border-2 border-ink bg-card px-1.5 py-0.5 text-center font-display text-sm tabular-nums text-ink focus:outline-none"
            />
          )}
          {inicio === "antes" && pct && <span className="font-display text-sm">%</span>}
        </OpcaoInicio>
      </div>
      {inicio === "antes" && (
        <p className="mt-2 font-serif text-[12px] italic text-ink-soft">
          O que você leu antes fica fora das metas e conquistas.
        </p>
      )}
    </div>
  );

  const conta = mostraConta && (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-soft">
      <span className="tabular-nums">
        {pct ? `${baseDigitada}% → ${fimDigitado}%` : `${abrev} ${base} → ${analise.fim}`}
      </span>
      <span
        className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
          analise.terminaLivro
            ? "bg-navy text-paper"
            : analise.delta > 0
              ? "bg-moss text-paper"
              : "bg-card text-ink"
        }`}
      >
        {pct ? "≈ " : analise.delta > 0 ? "+" : ""}
        {analise.delta} {rotuloUnidade(paginas, analise.delta)}
        {analise.terminaLivro ? " · fim do livro" : ""}
      </span>
    </div>
  );

  const aviso = informado && alertaPendente && analise && (
    <div className="flex flex-col gap-2.5 rounded-md border-2 border-coral bg-card p-3" role="alert">
      {alerta === "menor" ? (
        <>
          <p className="text-[13px] leading-snug text-ink">
            Você estava {na(pct ? baseDigitada : base)}. Quer voltar para {pct ? `${fimDigitado}%` : `a ${analise.fim}`}?
          </p>
          <p className="text-[12px] text-ink-soft">
            A posição do livro muda e esta sessão não soma {rotuloUnidade(paginas, 2)}.
          </p>
        </>
      ) : (
        <p className="text-[13px] leading-snug text-ink">
          São {analise.delta} páginas em {minutos} min. Confere?
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setConfirmado(chaveAlerta)}
          className="rounded-md border-2 border-ink bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper shadow-[2px_2px_0_0_var(--color-coral)]"
        >
          {alerta === "menor" ? `Voltar para ${pct ? `${fimDigitado}%` : `a ${analise.fim}`}` : "Li tudo isso"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (alerta === "menor") setValor(pct ? baseDigitada : base);
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
          className="rounded-md border-2 border-ink bg-card px-3 py-1.5 text-[12px] font-semibold text-ink"
        >
          {alerta === "menor" ? "Digitei errado" : "Corrigir"}
        </button>
      </div>
    </div>
  );

  const terminaNota = mostraConta && analise.terminaLivro && analise.delta > 0 && (
    <p className="font-serif text-[12px] italic text-ink-soft">Ao salvar, o livro vai para “terminei”.</p>
  );

  const bloqueioInline = informado && voltouDoInicio && (
    <p className="text-[12px] font-medium text-coral">{bloqueio}</p>
  );

  if (variante === "checkin") {
    return (
      <div className="flex flex-col gap-2">
        <label
          htmlFor={`checkin-posicao-${unidade}`}
          className="block font-display text-[10px] uppercase tracking-widest text-ink"
        >
          {rotulo}
        </label>
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            id={`checkin-posicao-${unidade}`}
            type="text"
            inputMode="numeric"
            value={valor ?? ""}
            onChange={(e) => {
              const n = limpar(e.target.value);
              setValor(n == null ? null : comTotal(n));
            }}
            placeholder={unidade === "pages" ? "pág." : "cap."}
            className="shadow-hard-sm w-28 shrink-0 rounded-md border-2 border-ink bg-card px-3 py-3 font-display text-lg tabular-nums text-ink"
          />
          <div className="min-w-0 flex-1">{conta}</div>
        </div>
        {pergunta}
        {bloqueioInline}
        {aviso}
        {terminaNota}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {pergunta}
      <div className="shadow-hard-sm rounded-md border-2 border-ink bg-mustard p-3">
        {topo}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setValor((v) => Math.max(0, (v ?? 0) - passo))}
            className="h-12 w-12 shrink-0 rounded-md border-2 border-ink bg-card font-display text-xl leading-none active:translate-y-0.5"
            aria-label="diminuir"
          >
            −
          </button>
          <label
            className={`shadow-hard-sm flex flex-1 cursor-text items-baseline justify-center gap-1 rounded-md border-2 border-ink py-2 transition-colors focus-within:bg-paper ${
              alertaPendente || voltouDoInicio ? "bg-coral/15" : "bg-card"
            }`}
          >
            {!pct && <span className="text-xs uppercase text-ink-soft">{abrev}</span>}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={valor ?? 0}
              onChange={(e) => setValor(comTotal(limpar(e.target.value) ?? 0))}
              aria-label={
                pct ? "Porcentagem onde você parou" : unidade === "pages" ? "Página onde você parou" : "Capítulo onde você parou"
              }
              className="w-20 bg-transparent text-center font-display text-3xl leading-none tabular-nums focus:outline-none"
            />
            {pct && <span className="font-display text-xl text-ink-soft">%</span>}
          </label>
          <button
            type="button"
            onClick={() => setValor((v) => comTotal((v ?? 0) + passo))}
            className="h-12 w-12 shrink-0 rounded-md border-2 border-ink bg-card font-display text-xl leading-none active:translate-y-0.5"
            aria-label="aumentar"
          >
            +
          </button>
        </div>
        {total != null && total > 0 && (
          <p className="mt-2 text-center text-[11px] text-ink/70">
            {pct ? `≈ pág. ${analise?.fim ?? 0} de ${total}` : `de ${total} ${rotuloUnidade(paginas, total)}`}
          </p>
        )}
      </div>
      {conta}
      {bloqueioInline}
      {aviso}
      {terminaNota}
    </div>
  );
}

function OpcaoInicio({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="radio"
      aria-checked={on}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex cursor-pointer items-center gap-2.5 rounded-md border-2 border-ink px-2.5 py-2 text-[13px] ${
        on ? "shadow-hard-sm bg-moss text-paper" : "bg-card text-ink"
      }`}
    >
      <span
        className={`size-4 shrink-0 rounded-full border-2 ${
          on ? "border-paper bg-paper shadow-[inset_0_0_0_3px_var(--color-moss)]" : "border-ink"
        }`}
      />
      {children}
    </div>
  );
}
