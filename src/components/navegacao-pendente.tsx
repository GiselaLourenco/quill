"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import {
  EsqueletoEstante,
  EsqueletoGenerico,
  EsqueletoHome,
  EsqueletoPerfil,
} from "@/components/esqueletos";

/**
 * Esqueleto instantâneo ao tocar numa aba da tab bar.
 *
 * O `loading.tsx` só aparece na hora se o Next tiver pré-carregado o esqueleto
 * antes do toque. Esse pré-carregamento some sempre que uma ação salva algo
 * (`revalidatePath`/`router.refresh` limpam o cache do roteador) e só volta
 * segundos depois — salvar o progresso e trocar de aba caía bem nessa janela,
 * e a tela ficava congelada esperando o servidor em Oregon.
 *
 * Aqui o esqueleto da aba de destino entra no próprio celular, no mesmo
 * instante do toque, e sai assim que a URL muda (aí quem assume é o
 * `loading.tsx` da rota, que desenha o mesmo esqueleto — a troca não pisca).
 */

type Ctx = { pendente: string | null; iniciar: (href: string) => void };

const NavegacaoCtx = createContext<Ctx>({ pendente: null, iniciar: () => {} });

export function useNavegacaoPendente() {
  return useContext(NavegacaoCtx);
}

/** O mesmo esqueleto que o loading.tsx de cada aba mostra. */
function EsqueletoDaAba({ href }: { href: string }) {
  if (href === "/") return <EsqueletoHome />;
  if (href === "/estante") return <EsqueletoEstante />;
  if (href === "/profile") return <EsqueletoPerfil />;
  return <EsqueletoGenerico />;
}

// Se a navegação falhar ou for cancelada a URL não muda; o esqueleto não pode
// ficar preso na tela.
const DESISTE_MS = 15_000;

export function NavegacaoPendenteProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [destino, setDestino] = useState<{ href: string; de: string } | null>(null);

  // A URL mudou: a navegação começou e o loading.tsx assume. Zera já, senão um
  // retorno à tela de origem (por outro link) reacenderia o esqueleto velho.
  if (destino && destino.de !== pathname) setDestino(null);

  const pendente = destino && destino.de === pathname ? destino.href : null;

  useEffect(() => {
    if (!destino) return;
    const t = setTimeout(() => setDestino(null), DESISTE_MS);
    return () => clearTimeout(t);
  }, [destino]);

  return (
    <NavegacaoCtx.Provider
      value={{
        pendente,
        iniciar: (href) => {
          setDestino({ href, de: pathname });
          // A tela de destino começa do topo; sem isto o esqueleto aparecia
          // fora da vista se a pessoa estava rolada lá embaixo.
          window.scrollTo({ top: 0 });
        },
      }}
    >
      {children}
    </NavegacaoCtx.Provider>
  );
}

/** Miolo da aba (dentro do <main>): a tela, ou o esqueleto do destino. */
export function AreaDaAba({ children }: { children: React.ReactNode }) {
  const { pendente } = useNavegacaoPendente();
  return (
    <>
      {pendente && <EsqueletoDaAba href={pendente} />}
      {/* A tela atual fica montada (só escondida): se a navegação desistir,
          ela volta como estava. `contents` não interfere no flex do <main>. */}
      <div className={pendente ? "hidden" : "contents"}>{children}</div>
    </>
  );
}
