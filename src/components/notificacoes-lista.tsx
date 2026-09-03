"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/adicionar-amigo";
import { aceitarPedido, recusarPedido } from "@/app/actions/friends";
import { addFriendBookToShelf } from "@/app/actions/media-items";
import { limparNotificacoes } from "@/app/actions/notificacoes";
import type { Notificacao, TipoNotificacao } from "@/lib/notificacoes";

const FILTROS: { id: "todas" | TipoNotificacao; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "amizade", label: "Amizades" },
  { id: "desafio", label: "Desafios" },
  { id: "indicacao", label: "Indicações" },
];

/**
 * Lista de notificações.
 *
 * Não existe "marcar como lida": cada item some quando é resolvido — o pedido
 * de amizade sai ao ser respondido, o desafio sai quando começa de fato. Ler
 * sem responder não muda nada, e é isso que a tela comunica ao não oferecer o
 * botão.
 */
/** Quantas entram por vez. Dez cabe numa tela sem virar rolagem infinita. */
const PAGINA = 10;

export function NotificacoesLista({ inicial }: { inicial: Notificacao[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<"todas" | TipoNotificacao>("todas");
  // Some da tela assim que respondido, antes do refresh do servidor chegar.
  const [resolvidos, setResolvidos] = useState<Record<string, string>>({});
  const [quantas, setQuantas] = useState(PAGINA);
  const [carregando, setCarregando] = useState(false);
  const [limpando, iniciarLimpeza] = useTransition();

  const daLista = useMemo(
    () => (filtro === "todas" ? inicial : inicial.filter((n) => n.tipo === filtro)),
    [inicial, filtro],
  );
  const visiveis = daLista.slice(0, quantas);
  const faltam = daLista.length - visiveis.length;

  function carregarMais() {
    setCarregando(true);
    // A lista já está na memória; a espera existe só pra o "carregando" ser
    // visível — sem ela o botão pisca e parece que nada aconteceu.
    setTimeout(() => {
      setQuantas((q) => q + PAGINA);
      setCarregando(false);
    }, 350);
  }

  function trocarFiltro(id: "todas" | TipoNotificacao) {
    setFiltro(id);
    // Filtro novo recomeça do topo: manter a contagem faria a lista abrir no
    // meio, já expandida, sem a pessoa ter pedido.
    setQuantas(PAGINA);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = filtro === f.id;
          const quantos =
            f.id === "todas" ? inicial.length : inicial.filter((n) => n.tipo === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => trocarFiltro(f.id)}
              aria-pressed={ativo}
              className={`rounded-md border-2 border-ink px-3 py-1.5 font-display text-[10px] uppercase tracking-wider ${
                ativo ? "shadow-hard-sm bg-navy text-paper" : "bg-paper text-ink"
              }`}
            >
              {f.label} {quantos > 0 && <span className="opacity-70">{quantos}</span>}
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <div className="shadow-hard flex flex-col items-center gap-2 rounded-md border-2 border-ink bg-paper px-5 py-10 text-center">
          <p className="font-display text-base uppercase text-ink">Nada por aqui</p>
          <p className="max-w-[240px] font-serif text-sm text-ink-soft">
            Quando alguém te chamar pra ler junto, indicar um livro ou pedir amizade, aparece
            nesta tela.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visiveis.map((n) => (
            <Card
              key={n.id}
              n={n}
              resolvido={resolvidos[n.id]}
              onResolver={(texto) => setResolvidos((p) => ({ ...p, [n.id]: texto }))}
            />
          ))}

          {faltam > 0 && (
            <button
              type="button"
              onClick={carregarMais}
              disabled={carregando}
              className="shadow-hard-sm rounded-md border-2 border-ink bg-card py-2.5 font-display text-[10px] uppercase tracking-widest text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
            >
              {carregando ? "carregando…" : `ver mais ${Math.min(faltam, PAGINA)}`}
            </button>
          )}

          {/* Limpar só em "Todas": é a ação de "vi tudo", e limpar de dentro de
              um filtro sugeriria que só aquele tipo seria zerado. */}
          {filtro === "todas" && (
            <button
              type="button"
              disabled={limpando}
              onClick={() =>
                iniciarLimpeza(async () => {
                  await limparNotificacoes();
                  router.refresh();
                })
              }
              className="mt-2 self-center text-xs font-semibold text-ink-soft underline underline-offset-2 hover:text-coral disabled:opacity-60"
            >
              {limpando ? "limpando…" : "Limpar notificações"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Card({
  n,
  resolvido,
  onResolver,
}: {
  n: Notificacao;
  resolvido?: string;
  onResolver: (texto: string) => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const base = "rounded-md border-2 border-ink p-4 shadow-hard";

  if (n.tipo === "amizade") {
    return (
      <article className={`${base} bg-paper`}>
        <div className="flex gap-3">
          <Avatar nome={n.autor ?? "?"} url={n.avatarUrl ?? null} bg={n.avatarBg ?? "#6D6885"} />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-ink">
              <strong className="font-bold">{n.autor}</strong> quer ser seu amigo no Quill.
            </p>
            <Quando texto={n.quando} />
          </div>
        </div>
        {resolvido ? (
          <p className="mt-3 font-display text-[10px] uppercase tracking-wider text-ink-soft">
            {resolvido}
          </p>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  await aceitarPedido(n.autorId!);
                  onResolver("Amizade aceita ✓");
                  router.refresh();
                })
              }
              className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-moss py-2 font-display text-[10px] uppercase tracking-wider text-paper disabled:opacity-60"
            >
              Aceitar
            </button>
            <button
              type="button"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  await recusarPedido(n.autorId!);
                  onResolver("Pedido recusado");
                  router.refresh();
                })
              }
              className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-paper py-2 font-display text-[10px] uppercase tracking-wider text-ink disabled:opacity-60"
            >
              Recusar
            </button>
          </div>
        )}
      </article>
    );
  }

  if (n.tipo === "desafio") {
    return (
      <article className={`${base} bg-mustard`}>
        <p className="font-serif text-sm font-semibold leading-snug text-ink">
          O desafio “{n.desafioNome}” {n.quando}. Bora?
        </p>
        <Quando texto={n.comecaEm === null ? "" : n.quando} />
        <Link
          href={`/juntos/${n.desafioId}`}
          className="shadow-hard-sm mt-3 inline-flex rounded-md border-2 border-ink bg-navy px-3 py-1.5 font-display text-[10px] uppercase tracking-wider text-paper"
        >
          Ver desafio
        </Link>
      </article>
    );
  }

  return (
    <article className={`${base} bg-paper`}>
      <p className="text-sm leading-snug text-ink">
        <strong className="font-bold">{n.autor}</strong> indicou{" "}
        <strong className="font-serif font-semibold">“{n.livroTitulo}”</strong> pra você.
      </p>
      {n.recado && (
        <p className="mt-1 font-serif text-xs italic text-ink-soft">“{n.recado}”</p>
      )}
      <Quando texto={n.quando} />
      <div className="mt-3 flex flex-wrap gap-2">
        {/* Só dá pra adicionar quando a indicação aponta pra um livro que
            existe: recomendação pode vir só com o título escrito à mão. */}
        {n.itemRef && (
          <button
            type="button"
            disabled={pendente || !!resolvido}
            onClick={() =>
              iniciar(async () => {
                const r = await addFriendBookToShelf({ sourceItemId: n.itemRef! });
                onResolver(r.error && !r.itemId ? r.error : "Na sua estante ✓");
                router.refresh();
              })
            }
            className="shadow-hard-sm rounded-md border-2 border-ink bg-coral px-3 py-1.5 font-display text-[10px] uppercase tracking-wider text-paper disabled:opacity-60"
          >
            {resolvido ?? "+ estante"}
          </button>
        )}
        {n.itemRef && (
          <Link
            href={`/books/${n.itemRef}`}
            className="rounded-md border-2 border-ink bg-paper px-3 py-1.5 font-display text-[10px] uppercase tracking-wider text-ink"
          >
            Ver livro
          </Link>
        )}
      </div>
    </article>
  );
}

function Quando({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <p className="mt-1 font-display text-[9px] uppercase tracking-widest text-ink/50">{texto}</p>
  );
}
