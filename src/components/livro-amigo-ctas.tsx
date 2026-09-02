"use client";

import { useState, useTransition } from "react";
import { Portal } from "@/components/portal";
import { BookThumb } from "@/components/book-thumb";
import { type CoverFields } from "@/components/book-cover";
import { addFriendBookToShelf } from "@/app/actions/media-items";
import { recommendBook } from "@/app/actions/recommendations";
import type { Friend } from "@/lib/friends";

type StatusInicial = "want" | "reading";

const STATUS_LABEL: Record<StatusInicial, string> = {
  want: "Quero ler",
  reading: "Lendo",
};

const STATUS_STYLE: Record<StatusInicial, string> = {
  want: "bg-mustard text-ink",
  reading: "bg-moss text-paper",
};

// CTAs da página do livro de um amigo: adicionar à minha estante (escolhendo o
// status inicial) e indicar o livro a outros amigos.
export function LivroAmigoCtas({
  item,
  friends,
}: {
  item: CoverFields & { id: string; creator: string | null };
  friends: Friend[];
}) {
  const [sheet, setSheet] = useState<null | "indicar" | "adicionar">(null);
  const [feito, setFeito] = useState(false);
  const [mensagemFeito, setMensagemFeito] = useState("");
  const [statusInicial, setStatusInicial] = useState<StatusInicial>("want");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startAction] = useTransition();

  function fecharSheet() {
    setSheet(null);
    setFeito(false);
    setSelecionados([]);
    setMensagem("");
    setErro(null);
  }

  function adicionar() {
    setErro(null);
    startAction(async () => {
      const r = await addFriendBookToShelf({
        sourceItemId: item.id,
        status: statusInicial,
      });
      if (r.error && !r.itemId) {
        setErro(r.error);
        return;
      }
      setMensagemFeito(
        r.error
          ? r.error
          : `“${item.title}” entrou como ${STATUS_LABEL[statusInicial].toLowerCase()}.`,
      );
      setFeito(true);
    });
  }

  function indicar() {
    if (selecionados.length === 0) return;
    setErro(null);
    startAction(async () => {
      for (const toUserId of selecionados) {
        await recommendBook({
          toUserId,
          itemRef: item.id,
          title: item.title,
          message: mensagem.trim() || null,
        });
      }
      setMensagemFeito(
        `${selecionados.length === 1 ? "1 amigo recebeu" : `${selecionados.length} amigos receberam`} sua indicação de “${item.title}”.`,
      );
      setFeito(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSheet("adicionar")}
        className="shadow-hard w-full border-2 border-ink bg-coral py-3 font-display text-sm uppercase tracking-wider text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        Adicionar à minha estante
      </button>
      <button
        type="button"
        onClick={() => setSheet("indicar")}
        disabled={friends.length === 0}
        className="shadow-hard w-full border-2 border-ink bg-paper py-3 font-display text-sm uppercase tracking-wider text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
      >
        {friends.length === 0 ? "Sem amigos para indicar" : "Indicar a alguém"}
      </button>

      {sheet === "adicionar" && (
        <Sheet titulo="Adicionar à estante" onFechar={fecharSheet}>
          {feito ? (
            <Confirmacao titulo="Na sua estante!" texto={mensagemFeito} onFechar={fecharSheet} />
          ) : (
            <>
              <div className="shadow-hard-sm flex items-center gap-3 border-2 border-ink bg-card p-3">
                <BookThumb item={item} />
                <div className="min-w-0">
                  <p className="truncate font-serif text-base font-bold leading-tight text-ink">
                    {item.title}
                  </p>
                  <p className="truncate font-serif text-xs italic text-ink-soft">
                    {item.creator ?? "sem autor"}
                  </p>
                </div>
              </div>

              <p className="mt-5 font-display text-xs uppercase tracking-wider text-ink">
                Começar como
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["want", "reading"] as StatusInicial[]).map((s) => {
                  const ativo = statusInicial === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusInicial(s)}
                      className={`shadow-hard-sm border-2 border-ink py-3 font-display text-xs uppercase tracking-wider active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                        ativo ? STATUS_STYLE[s] : "bg-card text-ink"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>

              {erro && <p className="mt-3 text-sm font-medium text-coral">{erro}</p>}

              <button
                type="button"
                onClick={adicionar}
                disabled={pendente}
                className="shadow-hard mt-6 w-full border-2 border-ink bg-coral py-3 font-display text-sm uppercase tracking-wider text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
              >
                {pendente ? "Adicionando…" : "Adicionar livro"}
              </button>
            </>
          )}
        </Sheet>
      )}

      {sheet === "indicar" && (
        <Sheet titulo="Indicar a alguém" onFechar={fecharSheet}>
          {feito ? (
            <Confirmacao titulo="Indicação enviada!" texto={mensagemFeito} onFechar={fecharSheet} />
          ) : (
            <>
              <p className="font-display text-xs uppercase tracking-wider text-ink">Para quem?</p>
              <ul className="mt-2 space-y-2">
                {friends.map((a) => {
                  const ativo = selecionados.includes(a.id);
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelecionados((prev) =>
                            prev.includes(a.id)
                              ? prev.filter((x) => x !== a.id)
                              : [...prev, a.id],
                          )
                        }
                        className={`shadow-hard-sm flex w-full items-center gap-3 border-2 border-ink p-2.5 text-left active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                          ativo ? "bg-mustard" : "bg-card"
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-navy font-display text-xs text-paper">
                          {a.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 truncate font-display text-sm uppercase tracking-wide text-ink">
                          {a.name}
                        </span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center border-2 border-ink font-display text-[10px] ${
                            ativo ? "bg-ink text-paper" : "bg-paper text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <label
                className="mt-5 block font-display text-xs uppercase tracking-wider text-ink"
                htmlFor="msg-indicacao-livro"
              >
                Mensagem (opcional)
              </label>
              <textarea
                id="msg-indicacao-livro"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
                placeholder="Acho que você vai amar esse..."
                className="shadow-hard-sm mt-2 w-full resize-none border-2 border-ink bg-card p-3 font-serif text-sm text-ink outline-none placeholder:text-ink-soft/60"
              />

              <button
                type="button"
                disabled={selecionados.length === 0 || pendente}
                onClick={indicar}
                className="shadow-hard mt-5 w-full border-2 border-ink bg-coral py-3 font-display text-sm uppercase tracking-wider text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:shadow-none"
              >
                {pendente
                  ? "Enviando…"
                  : selecionados.length > 1
                    ? `Indicar para ${selecionados.length} amigos`
                    : "Indicar"}
              </button>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

function Sheet({
  titulo,
  onFechar,
  children,
}: {
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  return (
    // Portal porque esta folha é declarada dentro da barra de CTAs, que é
    // `fixed z-20` e portanto cria contexto de empilhamento: sem sair de lá, o
    // z-30 dela valeria 20 e a tab bar cortaria a folha ao meio.
    <Portal>
    <div className="fixed inset-0 z-30 flex justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="shadow-hard relative mt-auto max-h-[85dvh] w-full max-w-[390px] overflow-y-auto border-x-2 border-t-2 border-ink bg-paper p-5 pb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg uppercase leading-none tracking-tight text-ink">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="shadow-hard-sm flex h-8 w-8 items-center justify-center border-2 border-ink bg-card font-display text-sm text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
    </Portal>
  );
}

function Confirmacao({
  titulo,
  texto,
  onFechar,
}: {
  titulo: string;
  texto: string;
  onFechar: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <div className="shadow-hard mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-moss font-display text-2xl text-paper">
        ✓
      </div>
      <h3 className="mt-4 font-display text-xl uppercase leading-none tracking-tight text-ink">
        {titulo}
      </h3>
      <p className="mt-2 font-serif text-sm text-ink-soft">{texto}</p>
      <button
        type="button"
        onClick={onFechar}
        className="shadow-hard mt-6 w-full border-2 border-ink bg-card py-3 font-display text-sm uppercase tracking-wider text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        Fechar
      </button>
    </div>
  );
}
