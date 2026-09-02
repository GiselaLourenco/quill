"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

const TOTAL = 9;
const PAGINAS = Array.from({ length: TOTAL }, (_, i) => `/img/lore/pag${i + 1}.webp`);
/** Tamanho nativo das páginas — todas iguais. */
const LARGURA = 941;
const ALTURA = 1672;
/** Arrasto mínimo pra contar como virada de página, e não como toque torto. */
const LIMIAR_PX = 50;

/**
 * Leitor da história do Quill.
 *
 * É quadrinho, não ilustração: a página tem 941px de largura, e encaixada num
 * celular de 390px o texto dos balões cai pra uns 6px. Por isso o leitor tem
 * dois estados — a página inteira, pra se situar, e o dobro do tamanho, pra
 * ler. Ampliado, o próprio container rola; é o gesto que qualquer app de
 * quadrinho usa.
 */
export function LoreLeitor() {
  const [pagina, setPagina] = useState(0);
  const [ampliado, setAmpliado] = useState(false);
  const inicioX = useRef<number | null>(null);
  const rolagem = useRef<HTMLDivElement>(null);

  function irPara(indice: number) {
    const proximo = Math.max(0, Math.min(TOTAL - 1, indice));
    if (proximo === pagina) return;
    setPagina(proximo);
    setAmpliado(false);
    // Página nova começa do topo, senão herda a rolagem da anterior.
    rolagem.current?.scrollTo({ top: 0, left: 0 });
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-ink">
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 text-paper">
        <Link href="/login" aria-label="Fechar a história" className="px-1 text-xl leading-none">
          ✕
        </Link>
        <span className="font-display text-[10px] uppercase tracking-widest">
          A história do Quill
        </span>
        <span className="font-display text-[10px] tabular-nums">
          {pagina + 1}/{TOTAL}
        </span>
      </header>

      <div
        ref={rolagem}
        // Ampliado o container rola nos dois eixos; encaixado ele não rola e o
        // gesto horizontal fica livre pra virar página.
        className={`flex-1 ${ampliado ? "overflow-auto" : "overflow-hidden"}`}
        onTouchStart={(e) => {
          inicioX.current = ampliado ? null : e.touches[0]!.clientX;
        }}
        onTouchEnd={(e) => {
          if (inicioX.current == null) return;
          const distancia = e.changedTouches[0]!.clientX - inicioX.current;
          inicioX.current = null;
          if (Math.abs(distancia) < LIMIAR_PX) return;
          irPara(distancia < 0 ? pagina + 1 : pagina - 1);
        }}
      >
        <button
          type="button"
          onClick={() => setAmpliado((v) => !v)}
          aria-label={ampliado ? "Reduzir a página" : "Ampliar a página para ler"}
          className={`block ${ampliado ? "w-[200%] max-w-none" : "mx-auto h-full"}`}
        >
          <Image
            src={PAGINAS[pagina]!}
            alt={`Página ${pagina + 1} da história do Quill`}
            width={LARGURA}
            height={ALTURA}
            // A primeira entra com prioridade; as outras só quando chega a vez.
            priority={pagina === 0}
            className={ampliado ? "w-full" : "mx-auto h-full w-auto object-contain"}
          />
        </button>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <Seta rotulo="Página anterior" desativada={pagina === 0} onClick={() => irPara(pagina - 1)}>
          ‹
        </Seta>

        <div className="flex items-center gap-1.5">
          {PAGINAS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Ir para a página ${i + 1}`}
              aria-current={i === pagina}
              className={`h-1.5 rounded-full transition-all ${
                i === pagina ? "w-5 bg-paper" : "w-1.5 bg-paper/40"
              }`}
            />
          ))}
        </div>

        <Seta
          rotulo="Próxima página"
          desativada={pagina === TOTAL - 1}
          onClick={() => irPara(pagina + 1)}
        >
          ›
        </Seta>
      </footer>

      <p className="pb-3 text-center text-[10px] text-paper/50">
        {ampliado ? "toque pra reduzir · arraste pra andar" : "deslize pra virar · toque pra ampliar"}
      </p>
    </div>
  );
}

function Seta({
  rotulo,
  desativada,
  onClick,
  children,
}: {
  rotulo: string;
  desativada: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desativada}
      aria-label={rotulo}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-paper/40 font-display text-lg leading-none text-paper disabled:opacity-25"
    >
      {children}
    </button>
  );
}
