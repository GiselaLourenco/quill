"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buscarPessoas,
  enviarPedido,
  type PessoaEncontrada,
} from "@/app/actions/friends";
import { avatarDeExibicao, AVATAR_FUNDO_PADRAO } from "@/lib/avatares";

const ESPERA_MS = 350;
const MIN_BUSCA = 3;

/**
 * Busca de pessoas para adicionar como amigo.
 *
 * Username casa por prefixo; e-mail só inteiro (ver `buscarPessoas`). Cada
 * resultado mostra em que pé a relação está, então quem já é amigo ou já
 * recebeu pedido não aparece com um "Adicionar" que não faria nada.
 */
export function AdicionarAmigo() {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [resposta, setResposta] = useState<{
    termo: string;
    pessoas: PessoaEncontrada[];
  } | null>(null);
  const [enviando, iniciarEnvio] = useTransition();
  // Marca localmente quem acabou de receber pedido: o resultado da busca é de
  // antes do clique, e refazer a busca inteira só pra trocar um rótulo seria
  // uma ida ao servidor à toa.
  const [enviados, setEnviados] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const limpo = termo.trim();
  const ativo = limpo.length >= MIN_BUSCA;

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    const timer = setTimeout(async () => {
      const pessoas = await buscarPessoas(limpo);
      if (!cancelado) setResposta({ termo: limpo, pessoas });
    }, ESPERA_MS);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [limpo, ativo]);

  function adicionar(pessoa: PessoaEncontrada) {
    setErro(null);
    iniciarEnvio(async () => {
      const r = await enviarPedido(pessoa.id);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setEnviados((prev) => [...prev, pessoa.id]);
      // Aceitar um pedido que já existia vira amizade na hora — a lista de
      // amigos atrás do diálogo precisa acompanhar.
      router.refresh();
    });
  }

  const atual = resposta?.termo === limpo ? resposta : null;

  return (
    <div className="mb-4 rounded-md border-2 border-ink bg-paper p-3">
      <p className="mb-2 font-display text-[11px] uppercase tracking-wider text-ink">
        Adicionar amigo
      </p>
      <input
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="nome de usuário ou e-mail"
        aria-label="Buscar pessoa por nome de usuário ou e-mail"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-md border-2 border-ink bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
      />

      {erro && <p className="mt-2 text-xs font-medium text-coral">{erro}</p>}

      {ativo && !atual && (
        <p className="mt-2 font-serif text-xs italic text-ink-soft">procurando…</p>
      )}

      {atual && atual.pessoas.length === 0 && (
        <p className="mt-2 font-serif text-xs italic text-ink-soft">
          {limpo.includes("@")
            ? "Ninguém com esse e-mail. Confira se está inteiro e sem espaços."
            : "Nenhum nome de usuário começa com isso."}
        </p>
      )}

      {atual && atual.pessoas.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {atual.pessoas.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-md border-2 border-ink bg-card p-1.5"
            >
              <Avatar nome={p.nome} url={p.avatarUrl} bg={p.avatarBg} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{p.nome}</span>
                {p.username && (
                  <span className="block truncate text-[11px] text-ink-soft">
                    @{p.username}
                  </span>
                )}
              </span>
              <Acao
                pessoa={p}
                jaEnviado={enviados.includes(p.id)}
                ocupado={enviando}
                onAdicionar={() => adicionar(p)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Acao({
  pessoa,
  jaEnviado,
  ocupado,
  onAdicionar,
}: {
  pessoa: PessoaEncontrada;
  jaEnviado: boolean;
  ocupado: boolean;
  onAdicionar: () => void;
}) {
  const situacao = jaEnviado ? "pedido-enviado" : pessoa.situacao;

  if (situacao === "voce") return <Etiqueta texto="você" />;
  if (situacao === "amigo") return <Etiqueta texto="já é amigo" />;
  if (situacao === "pedido-enviado") return <Etiqueta texto="aguardando" />;

  return (
    <button
      type="button"
      onClick={onAdicionar}
      disabled={ocupado}
      className="shadow-hard-sm shrink-0 rounded-md border-2 border-ink bg-coral px-2.5 py-1.5 font-display text-[10px] uppercase tracking-wider text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
    >
      {/* Quem já pediu pra mim vira "Aceitar": mandar pedido de volta deixaria
          os dois esperando um do outro. */}
      {situacao === "pedido-recebido" ? "Aceitar" : "Adicionar"}
    </button>
  );
}

function Etiqueta({ texto }: { texto: string }) {
  return (
    <span className="shrink-0 font-display text-[10px] uppercase tracking-wider text-ink-soft">
      {texto}
    </span>
  );
}

export function Avatar({
  nome,
  url,
  bg,
  tamanho = 32,
}: {
  nome: string;
  url: string | null;
  bg: string;
  tamanho?: number;
}) {
  const arte = avatarDeExibicao(url);
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink"
      style={{ height: tamanho, width: tamanho, backgroundColor: bg || AVATAR_FUNDO_PADRAO }}
    >
      <Image
        src={arte.src}
        alt={nome}
        width={tamanho}
        height={tamanho}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}
