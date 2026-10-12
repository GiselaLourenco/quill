"use client";

import { useEffect, useState } from "react";
import { MIN_CARACTERES, type LivroEncontrado } from "@/lib/open-library";

const ESPERA_MS = 400;

type Props = {
  termo: string;
  onEscolher: (livro: LivroEncontrado) => void;
  /** Fecha a lista sem escolher nada. */
  onDispensar: () => void;
};

/**
 * Busca o termo digitado (Google Books, com Open Library como fallback — ver
 * /api/livros) e oferece o resultado pra preencher o formulário. Nunca
 * preenche sozinha: no teste, "pequeno príncipe" trouxe um autor errado com
 * toda a confiança — quem escolhe é a pessoa.
 *
 * Quem chama controla quando isto aparece: some assim que a pessoa escolhe um
 * resultado, e só volta se ela mexer no campo de novo (título ou autor).
 *
 * O formulário inteiro segue utilizável enquanto isto carrega (ou falha).
 */
export function BuscaLivro({ termo, onEscolher, onDispensar }: Props) {
  // A resposta carrega o termo que a gerou: enquanto a pessoa digita, a lista
  // antiga não fica pendurada embaixo de um título que já mudou.
  const [resposta, setResposta] = useState<{
    termo: string;
    livros: LivroEncontrado[];
  } | null>(null);

  const limpo = termo.trim();
  const ativo = limpo.length >= MIN_CARACTERES;

  useEffect(() => {
    if (!ativo) return;

    const controle = new AbortController();
    // Sem espera, "torto arado" dispara 11 buscas de ~1s atropelando umas às
    // outras. Com ela, é uma só, quando a pessoa para de digitar.
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/livros?q=${encodeURIComponent(limpo)}`, {
          signal: controle.signal,
        });
        const data = (await res.json()) as { livros?: LivroEncontrado[] };
        setResposta({ termo: limpo, livros: data.livros ?? [] });
      } catch {
        // Abortada pela digitação seguinte: a próxima busca já vem, não mexe
        // na tela. Qualquer outra falha (rede fora, Open Library fora, sessão
        // vencida — que o proxy redireciona pro login e quebra o json) vira
        // "não achei": esqueleto eterno seria pior que preencher na mão.
        if (!controle.signal.aborted) setResposta({ termo: limpo, livros: [] });
      }
    }, ESPERA_MS);

    return () => {
      clearTimeout(timer);
      controle.abort();
    };
  }, [limpo, ativo]);

  if (!ativo) return null;

  // Resposta de um termo anterior (ainda chegando quando a pessoa já digitou
  // mais) não vale pro que está escrito agora.
  const atual = resposta?.termo === limpo ? resposta : null;

  if (!atual) {
    return (
      <div className="flex flex-col gap-1.5" aria-live="polite">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md border-2 border-dashed border-ink/30 bg-white p-1.5"
          >
            <div className="h-9 w-6 shrink-0 rounded-sm bg-ink/10" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-2 rounded-full bg-ink/10" style={{ width: i ? "60%" : "80%" }} />
              <div className="h-2 rounded-full bg-ink/10" style={{ width: i ? "35%" : "50%" }} />
            </div>
          </div>
        ))}
        <p className="font-serif text-xs italic text-ink/60">procurando…</p>
      </div>
    );
  }

  if (atual.livros.length === 0) {
    return (
      <p className="text-xs text-ink/60">
        Não achei esse título — pode preencher na mão, funciona igual.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1.5">
        {atual.livros.map((livro) => (
          <li key={livro.id}>
            <button
              type="button"
              // Sem isto, tocar no resultado tira o foco do campo de texto
              // ANTES do clique — e some com toda essa lista bem no meio do
              // caminho do toque, sem realmente registrar a escolha. Impedir
              // o foco de sair mantém a lista (e o clique) de pé.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onEscolher(livro)}
              className="flex w-full items-center gap-2 rounded-md border-2 border-ink bg-white p-1.5 text-left transition-all hover:shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              {livro.capaThumb ? (
                // Thumb do Open Library/Google Books já vem no tamanho certo; passar
                // pelo next/image só gastava cota de transformação da Vercel à toa
                // (busca ao vivo = uma transformação nova por tecla, pra uma capa
                // quase sempre descartada).
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={livro.capaThumb}
                  alt=""
                  aria-hidden
                  width={26}
                  height={36}
                  loading="lazy"
                  className="h-9 w-[26px] shrink-0 rounded-sm border border-ink/40 object-cover"
                />
              ) : (
                <span className="h-9 w-[26px] shrink-0 rounded-sm border border-ink/40 bg-cover-3" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{livro.titulo}</span>
                <span className="block truncate text-[11px] text-ink/60">
                  {livro.autor ?? "autor desconhecido"}
                </span>
                <span
                  className={`block text-[11px] ${livro.paginas ? "text-moss-dark" : "text-ink/50"}`}
                >
                  {livro.paginas ? `${livro.paginas} pág` : "sem páginas"}
                  {livro.ano ? ` · ${livro.ano}` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {/* A busca casa por palavra solta, então uma lista sem nada a ver é
          resultado normal — e antes ela ficava plantada na tela enquanto a
          pessoa preenchia o resto do formulário. */}
      <div className="flex items-center justify-between gap-2">
        <p className="font-serif text-xs italic text-ink/60">
          toque um pra preencher tudo, ou siga digitando
        </p>
        <button
          type="button"
          onClick={onDispensar}
          className="shrink-0 text-xs font-semibold text-ink/60 underline underline-offset-2 hover:text-coral"
        >
          nenhum desses
        </button>
      </div>
    </div>
  );
}
