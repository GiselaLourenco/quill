"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { MIN_CARACTERES, type LivroEncontrado } from "@/lib/open-library";

const ESPERA_MS = 400;

type Props = {
  termo: string;
  escolhido: LivroEncontrado | null;
  onEscolher: (livro: LivroEncontrado) => void;
  onLimpar: () => void;
};

/**
 * Busca o título digitado na Open Library e oferece o resultado pra preencher
 * o formulário. Nunca preenche sozinha: no teste, "pequeno príncipe" trouxe um
 * autor errado com toda a confiança — quem escolhe é a pessoa.
 *
 * O formulário inteiro segue utilizável enquanto isto carrega (ou falha).
 */
export function BuscaLivro({ termo, escolhido, onEscolher, onLimpar }: Props) {
  // A resposta carrega o termo que a gerou: enquanto a pessoa digita, a lista
  // antiga não fica pendurada embaixo de um título que já mudou.
  const [resposta, setResposta] = useState<{
    termo: string;
    livros: LivroEncontrado[];
  } | null>(null);

  const limpo = termo.trim();
  const ativo = !escolhido && limpo.length >= MIN_CARACTERES;

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

  if (escolhido) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="flex items-start gap-2 rounded-md border-2 border-moss bg-moss/15 px-2.5 py-2 text-xs leading-snug text-moss-dark">
          <span aria-hidden>✓</span>
          <span>
            Autor, páginas e capa vieram da Open Library — pode editar tudo. O
            título é o que você escreveu.
          </span>
        </p>
        <button
          type="button"
          onClick={onLimpar}
          className="self-start text-xs text-ink/60 underline underline-offset-2 hover:text-coral"
        >
          não é esse livro? buscar de novo
        </button>
      </div>
    );
  }

  if (!ativo) return null;

  // Resposta de um termo anterior não vale pro que está escrito agora.
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
              onClick={() => onEscolher(livro)}
              className="flex w-full items-center gap-2 rounded-md border-2 border-ink bg-white p-1.5 text-left transition-all hover:shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              {livro.capaThumb ? (
                <Image
                  src={livro.capaThumb}
                  alt=""
                  aria-hidden
                  width={26}
                  height={36}
                  className="h-9 w-[26px] shrink-0 rounded-sm border border-ink/40 object-cover"
                />
              ) : (
                <span className="h-9 w-[26px] shrink-0 rounded-sm border border-ink/40 bg-cover-3" />
              )}
              <span className="min-w-0 flex-1">
                {/* O catálogo indexa a obra pelo nome original, então este
                    título pode vir em outro idioma. Serve pra confirmar que é o
                    livro certo; o que vai pro cadastro é o que você digitou. */}
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
      <p className="font-serif text-xs italic text-ink/60">
        toque pra preencher, ou siga digitando
      </p>
    </div>
  );
}
