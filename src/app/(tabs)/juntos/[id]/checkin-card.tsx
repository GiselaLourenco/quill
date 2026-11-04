"use client";

import { useState, useTransition } from "react";
import { GifPicker } from "@/components/gif-picker";
import { Spinner } from "@/components/carregando";
import type { SessaoDoDia } from "@/app/actions/sessions";

export type MembroCor = { userId: string; nome: string; cor: string; ehVoce: boolean };

export type ComentarioCheckin = {
  id: string;
  nome: string;
  cor: string;
  texto: string | null;
  gifUrl: string | null;
  quando: string;
};

export type CheckinDetalhe = {
  id: string;
  userId: string;
  nome: string;
  /** Cor do membro — a mesma dos pontos do calendário. */
  cor: string;
  dia: string; // YYYY-MM-DD, fuso do Brasil
  /** Dias em que a leitura conta — mais de um quando virou a noite. Sem isso, só `dia`. */
  dias?: string[];
  texto: string; // "leu 36 pgs"
  /** Esse check-in fechou o livro. */
  terminou?: boolean;
  /** Posição no livro depois da sessão; `total` null quando o livro não é visível. */
  progresso?: { atual: number; total: number | null; unidade: "pág" | "cap" } | null;
  detalhe: string | null; // "19 min · Circe"
  nota: string | null;
  quando: string;
  comentarios: ComentarioCheckin[];
  /** A sessão do check-in, no formato do painel do dia (capa, horário, páginas). */
  sessao: SessaoDoDia | null;
};

/** Devolve a mensagem de erro, ou null se deu certo. */
export type ComentarCheckin = (
  checkinId: string,
  texto: string,
  gifUrl: string | null,
) => Promise<string | null>;

/**
 * Um check-in do desafio: quem, quanto leu, a nota e os comentários — com o
 * "comentar" que abre a caixa de texto + GIF. Usado no feed e no painel do dia.
 */
export function CheckinCard({
  c,
  comentar,
  meuNome,
  minhaCor,
}: {
  c: CheckinDetalhe;
  comentar: ComentarCheckin;
  meuNome: string;
  minhaCor: string;
}) {
  return (
    <div className="border-2 border-ink bg-paper p-3 shadow-hard-sm">
      <div className="flex items-start gap-3">
        {/* ✓ = check-in, balão = check-in com nota */}
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink text-paper"
          style={{ backgroundColor: c.cor }}
        >
          {c.nota ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] leading-tight text-ink">
            <span className="font-display text-[11px] uppercase tracking-wider">{c.nome}</span> {c.texto}
          </p>
          <span className="mt-1 block font-display text-[9px] uppercase tracking-widest text-ink-soft">
            {c.quando}
            {c.detalhe ? ` · ${c.detalhe}` : ""}
          </span>
          {c.progresso && <ProgressoNoLivro p={c.progresso} terminou={Boolean(c.terminou)} />}
        </div>
      </div>

      {/* key: quando o refresh traz o comentário do servidor, remonta e
          descarta a cópia otimista — senão ele aparecia duas vezes. */}
      <CheckinConversa key={c.comentarios.length} c={c} comentar={comentar} meuNome={meuNome} minhaCor={minhaCor} recuo />
    </div>
  );
}

/** "▓▓▓░░ pág 120 de 300" — onde a pessoa está no livro depois do check-in. */
function ProgressoNoLivro({
  p,
  terminou,
}: {
  p: NonNullable<CheckinDetalhe["progresso"]>;
  terminou: boolean;
}) {
  const percent = p.total ? Math.min(100, Math.round((p.atual / p.total) * 100)) : null;
  const rotulo = p.total
    ? terminou
      ? `${p.total} de ${p.total}`
      : `${p.unidade} ${p.atual} de ${p.total}`
    : `${p.unidade} ${p.atual}`;
  return (
    <div className="mt-2 flex items-center gap-2">
      {percent != null && (
        <div className="h-2.5 flex-1 border-2 border-ink bg-paper">
          <div
            className={`h-full ${terminou ? "bg-coral" : "bg-moss"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      <span className="shrink-0 font-display text-[9px] uppercase tracking-widest text-ink">{rotulo}</span>
    </div>
  );
}

/**
 * Nota, comentários e o "comentar" de um check-in — embaixo do cartão no feed
 * e embaixo da sessão no painel do dia.
 */
export function CheckinConversa({
  c,
  comentar,
  meuNome,
  minhaCor,
  recuo = false,
}: {
  c: CheckinDetalhe;
  comentar: ComentarCheckin;
  meuNome: string;
  minhaCor: string;
  /** Alinha com o texto ao lado do quadradinho (feed). */
  recuo?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  // Comentários enviados agora aparecem na hora, sem esperar o refresh.
  const [novos, setNovos] = useState<ComentarioCheckin[]>([]);
  const comentarios = [...c.comentarios, ...novos];
  const ml = recuo ? "ml-11" : "";

  return (
    <>
      {c.nota && (
        <div className={`relative ${ml} mt-3 border-2 border-ink bg-mustard/40 p-3`}>
          <span aria-hidden className="absolute -top-[7px] left-4 h-3 w-3 rotate-45 border-l-2 border-t-2 border-ink bg-mustard/40" />
          <p className="font-serif text-[13px] italic leading-snug text-ink">&ldquo;{c.nota}&rdquo;</p>
        </div>
      )}

      {comentarios.length > 0 && (
        <ul className={`${ml} mt-3 space-y-2 border-l-2 border-ink/15 pl-3`}>
          {comentarios.map((k) => (
            <li key={k.id} className="text-[12px] leading-snug text-ink">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full border border-ink align-middle" style={{ backgroundColor: k.cor }} />
              <span className="font-semibold">{k.nome}</span>{" "}
              {k.texto && <span>{k.texto}</span>}
              <span className="ml-1.5 text-[10px] text-ink-soft">{k.quando}</span>
              {k.gifUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- GIF externo do Giphy
                <img src={k.gifUrl} alt="GIF" className="mt-1.5 block max-h-28 rounded border-2 border-cover-border" />
              )}
            </li>
          ))}
        </ul>
      )}

      {!aberto && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="text-[11px] font-semibold text-ink-soft underline underline-offset-2"
          >
            comentar
          </button>
        </div>
      )}

      {aberto && (
        <div className={`${ml} mt-2`}>
          <CaixaComentario
            onCancelar={() => setAberto(false)}
            onEnviar={async (texto, gifUrl) => {
              const erro = await comentar(c.id, texto, gifUrl);
              if (erro) return erro;
              setNovos((n) => [
                ...n,
                { id: `novo-${Date.now()}`, nome: meuNome, cor: minhaCor, texto: texto.trim() || null, gifUrl, quando: "agora" },
              ]);
              setAberto(false);
              return null;
            }}
          />
        </div>
      )}
    </>
  );
}

/** A mesma caixa do comentário de livro (texto + GIF + Enviar), sem nível nem visibilidade. */
function CaixaComentario({
  onEnviar,
  onCancelar,
}: {
  onEnviar: (texto: string, gifUrl: string | null) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [mostrarGif, setMostrarGif] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startEnvio] = useTransition();
  const podeEnviar = texto.trim().length > 0 || gifUrl != null;

  return (
    <div className="rounded-md border-2 border-ink bg-white p-3">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escrever um comentário"
        rows={2}
        autoFocus
        className="block w-full resize-none rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
      />

      {gifUrl && (
        <div className="relative mt-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- GIF externo do Giphy */}
          <img src={gifUrl} alt="GIF escolhido" className="max-h-28 rounded border-2 border-cover-border" />
          <button
            type="button"
            onClick={() => setGifUrl(null)}
            aria-label="Remover GIF"
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {mostrarGif && !gifUrl && (
        <div className="mt-2">
          <GifPicker
            onSelect={(url) => {
              setGifUrl(url);
              setMostrarGif(false);
            }}
            onClose={() => setMostrarGif(false)}
          />
        </div>
      )}

      {erro && <p className="mt-2 text-[11px] font-semibold text-coral">{erro}</p>}

      <div className="mt-2 flex items-center gap-2">
        {!gifUrl && (
          <button
            type="button"
            onClick={() => setMostrarGif((v) => !v)}
            className="rounded border-2 border-ink bg-white px-2.5 py-1 text-xs font-semibold"
          >
            GIF
          </button>
        )}
        <button
          type="button"
          onClick={onCancelar}
          className="text-xs font-semibold text-ink-soft underline underline-offset-2"
        >
          cancelar
        </button>
        <button
          type="button"
          disabled={!podeEnviar || enviando}
          onClick={() =>
            startEnvio(async () => {
              setErro(null);
              const e = await onEnviar(texto, gifUrl);
              if (e) setErro(e);
            })
          }
          className="ml-auto rounded border-2 border-ink bg-moss-dark px-4 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
        >
          {enviando ? <Spinner /> : "Enviar"}
        </button>
      </div>
    </div>
  );
}
