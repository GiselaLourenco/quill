"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionarAmigoAoDesafio } from "@/app/actions/groups";
import { Avatar } from "@/components/adicionar-amigo";

export type AmigoConvidavel = {
  id: string;
  nome: string;
  avatarUrl: string | null;
  avatarBg: string;
  jaEstaNoDesafio: boolean;
};

/**
 * Puxa um amigo pra um desafio já criado.
 *
 * Existe porque o código de convite resolve só metade do problema: serve pra
 * quem está fora do app ou fora da sua lista, mas obriga a sair do Quill,
 * mandar o código e esperar a pessoa colar. Para quem já é seu amigo aqui,
 * isso é atrito à toa.
 */
export function ConvidarAmigoDesafio({
  groupId,
  amigos,
}: {
  groupId: string;
  amigos: AmigoConvidavel[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [adicionados, setAdicionados] = useState<string[]>([]);
  const [pendente, iniciar] = useTransition();

  const disponiveis = amigos.filter(
    (a) => !a.jaEstaNoDesafio && !adicionados.includes(a.id),
  );

  if (amigos.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-card py-2.5 font-display text-[10px] uppercase tracking-widest text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
      >
        {aberto ? "fechar" : "chamar um amigo"}
      </button>

      {aberto && (
        <div className="mt-2 flex flex-col gap-1.5">
          {disponiveis.length === 0 ? (
            <p className="font-serif text-xs italic text-ink-soft">
              Todos os seus amigos já estão neste desafio.
            </p>
          ) : (
            disponiveis.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-md border-2 border-ink bg-card p-1.5"
              >
                <Avatar nome={a.nome} url={a.avatarUrl} bg={a.avatarBg} tamanho={28} />
                <span className="min-w-0 flex-1 truncate text-xs font-bold">{a.nome}</span>
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await adicionarAmigoAoDesafio({ groupId, friendId: a.id });
                      if (r.error) return;
                      setAdicionados((p) => [...p, a.id]);
                      router.refresh();
                    })
                  }
                  className="shadow-hard-sm shrink-0 rounded-md border-2 border-ink bg-coral px-2.5 py-1 font-display text-[10px] uppercase tracking-wider text-paper disabled:opacity-60"
                >
                  Chamar
                </button>
              </div>
            ))
          )}

          {adicionados.length > 0 && (
            <p className="font-display text-[10px] uppercase tracking-wider text-moss-dark">
              {adicionados.length} {adicionados.length === 1 ? "chamado" : "chamados"} ✓
            </p>
          )}
        </div>
      )}
    </div>
  );
}
