"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AJUSTE_PADRAO, type MapaSlots, type SlotImagem } from "@/lib/ajustes-imagem";
import { rotuloDoSlot } from "@/lib/slots-imagem";
import { limparSlotImagem, salvarSlotImagem } from "@/app/actions/admin";
import type { Previa } from "@/components/imagens-provider";

const CHAVE_MODO = "quill:edicao-imagens";

/**
 * O modo de edição vive no localStorage (segue ligado entre telas e recargas),
 * não em estado do React — daí a leitura por `useSyncExternalStore`.
 */
const ouvintesModo = new Set<() => void>();

function assinarModo(aviso: () => void) {
  ouvintesModo.add(aviso);
  return () => {
    ouvintesModo.delete(aviso);
  };
}

function lerModo() {
  return window.localStorage.getItem(CHAVE_MODO) === "1";
}

function definirModo(ligado: boolean) {
  window.localStorage.setItem(CHAVE_MODO, ligado ? "1" : "0");
  for (const aviso of ouvintesModo) aviso();
}

function Lapis({ tamanho = 13 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4L20 8l-4-4L4 16v4z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Camada de edição de artes — só existe para admin.
 *
 * Desenha um lápis por cima de cada imagem de slot que está na tela. Os lápis
 * ficam numa camada fixa, posicionada pelo retângulo de cada imagem, para o
 * layout que o admin está ajustando ser exatamente o que o usuário vê.
 */
export function EditorImagens({
  slots,
  catalogo,
  onPrevia,
}: {
  slots: MapaSlots;
  catalogo: string[];
  onPrevia: (p: Previa) => void;
}) {
  const modo = useSyncExternalStore(assinarModo, lerModo, () => false);
  const [alvo, setAlvo] = useState<{ slot: string; padrao: string } | null>(null);
  const [marcas, setMarcas] = useState<{ slot: string; padrao: string; x: number; y: number }[]>([]);

  // Os lápis seguem as imagens: remedimos a cada scroll (inclusive o do
  // container interno, por isso captura), resize e troca de tela.
  useEffect(() => {
    if (!modo) return;
    let raf = 0;
    const medir = () => {
      raf = 0;
      const vistos = new Set<string>();
      const novas: typeof marcas = [];
      // As imagens editáveis se anunciam com `data-slot` (ver AppImage), então
      // basta varrer o DOM — funciona para qualquer tela, sem cada uma avisar.
      for (const el of document.querySelectorAll<HTMLElement>("[data-slot]")) {
        const slot = el.dataset.slot;
        if (!slot || vistos.has(slot)) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) continue;
        vistos.add(slot);
        novas.push({
          slot,
          padrao: el.dataset.padrao ?? "",
          x: Math.min(window.innerWidth - 18, r.right - 6),
          y: Math.max(16, r.top + 6),
        });
      }
      setMarcas(novas);
    };
    const agendar = () => {
      if (!raf) raf = requestAnimationFrame(medir);
    };
    agendar();
    window.addEventListener("scroll", agendar, true);
    window.addEventListener("resize", agendar);
    const observador = new ResizeObserver(agendar);
    observador.observe(document.body);
    const intervalo = window.setInterval(agendar, 700);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", agendar, true);
      window.removeEventListener("resize", agendar);
      observador.disconnect();
      window.clearInterval(intervalo);
    };
  }, [modo]);

  const alternar = () => {
    const proximo = !modo;
    definirModo(proximo);
    if (!proximo) {
      setAlvo(null);
      onPrevia(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={alternar}
        aria-pressed={modo}
        className={`shadow-hard-sm fixed bottom-24 right-3 z-[70] flex h-11 items-center gap-1.5 rounded-full border-2 border-ink px-3 font-display text-[10px] uppercase tracking-tight ${
          modo ? "bg-coral text-paper" : "bg-card text-ink"
        }`}
      >
        <Lapis tamanho={14} />
        {modo ? "editando artes" : "editar artes"}
      </button>

      {modo && (
        <div className="pointer-events-none fixed inset-0 z-[60]">
          {marcas.map((m) => (
            <button
              key={m.slot}
              type="button"
              onClick={() => setAlvo({ slot: m.slot, padrao: m.padrao })}
              aria-label={`Editar arte: ${rotuloDoSlot(m.slot)}`}
              style={{ left: m.x, top: m.y }}
              className="pointer-events-auto absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-paper bg-ink text-paper"
            >
              <Lapis />
            </button>
          ))}
        </div>
      )}

      {alvo && (
        <FolhaSlot
          slot={alvo.slot}
          padrao={alvo.padrao}
          config={slots[alvo.slot]}
          catalogo={catalogo}
          onPrevia={onPrevia}
          onFechar={() => {
            setAlvo(null);
            onPrevia(null);
          }}
        />
      )}
    </>
  );
}

/**
 * Editor de um ponto do app: qual arte fica ali e como ela é enquadrada.
 * Usado pelo lápis na tela e pela lista do /admin.
 */
export function FolhaSlot({
  slot,
  padrao,
  config,
  catalogo,
  enquadra = true,
  onPrevia,
  onFechar,
}: {
  slot: string;
  padrao: string;
  config: SlotImagem | undefined;
  catalogo: string[];
  enquadra?: boolean;
  onPrevia?: (p: Previa) => void;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [src, setSrc] = useState<string | null>(config?.src ?? null);
  const [zoom, setZoom] = useState(config?.zoom ?? AJUSTE_PADRAO.zoom);
  const [posX, setPosX] = useState(config?.posX ?? AJUSTE_PADRAO.posX);
  const [posY, setPosY] = useState(config?.posY ?? AJUSTE_PADRAO.posY);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSave] = useTransition();

  // A imagem na própria tela acompanha os sliders — o editor mostra o
  // resultado no lugar real, não só na miniatura aqui dentro.
  useEffect(() => {
    onPrevia?.({ slot, src, zoom, posX, posY });
  }, [onPrevia, slot, src, zoom, posX, posY]);

  const srcVisivel = src ?? padrao;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 px-4 pb-6">
      <div className="shadow-hard max-h-[86vh] w-full max-w-[390px] overflow-y-auto rounded-md border-2 border-ink bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="min-w-0">
            <span className="block truncate font-display text-base uppercase leading-none tracking-tight">
              {rotuloDoSlot(slot)}
            </span>
            <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-tight text-ink-soft">
              {slot} · {srcVisivel.replace("/img/", "")}
            </span>
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="shadow-hard-sm flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-paper font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="shadow-hard flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-paper">
            <Image
              src={srcVisivel}
              alt=""
              width={96}
              height={96}
              className="h-full w-full object-contain"
              style={{ transform: `scale(${zoom / 100})`, objectPosition: `${posX}% ${posY}%` }}
            />
          </div>
          <p className="font-serif text-xs italic leading-snug text-ink-soft">
            {enquadra
              ? "A imagem na tela atrás acompanha os controles — o que você vê já é o resultado."
              : "O ícone é gerado a partir desta arte, recortada em quadrado."}
          </p>
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-tight text-ink-soft">
          Trocar imagem
        </p>
        <div className="mt-2 grid max-h-44 grid-cols-4 gap-2 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => setSrc(null)}
            className={`flex aspect-square items-center justify-center rounded-md border-2 p-1 text-center text-[9px] font-bold uppercase leading-tight ${
              src === null ? "border-coral bg-paper text-coral" : "border-ink/25 bg-paper text-ink-soft"
            }`}
          >
            arte padrão
          </button>
          {catalogo.map((arte) => (
            <button
              key={arte}
              type="button"
              onClick={() => setSrc(arte)}
              aria-label={arte.replace("/img/", "")}
              className={`flex aspect-square items-center justify-center overflow-hidden rounded-md border-2 bg-paper p-1 ${
                src === arte ? "border-coral" : "border-ink/25"
              }`}
            >
              <Image
                src={arte}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>

        {enquadra && (
          <>
            <Controle rotulo="Zoom" valor={zoom} min={50} max={300} onChange={setZoom} />
            <Controle rotulo="Horizontal" valor={posX} min={0} max={100} onChange={setPosX} />
            <Controle rotulo="Vertical" valor={posY} min={0} max={100} onChange={setPosY} />
          </>
        )}

        {erro && <p className="mt-3 text-sm font-medium text-coral">{erro}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={salvando}
            onClick={() =>
              startSave(async () => {
                const r = await limparSlotImagem(slot);
                if (r.error) {
                  setErro(r.error);
                  return;
                }
                onPrevia?.(null);
                router.refresh();
                onFechar();
              })
            }
            className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-paper py-3 font-display text-xs uppercase tracking-tight active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
          >
            Restaurar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={() =>
              startSave(async () => {
                const r = await salvarSlotImagem({ slot, src, zoom, posX, posY });
                if (r.error) {
                  setErro(r.error);
                  return;
                }
                onPrevia?.(null);
                router.refresh();
                onFechar();
              })
            }
            className="shadow-hard-sm flex-[1.4] rounded-md border-2 border-ink bg-moss py-3 font-display text-xs uppercase tracking-tight text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
          >
            {salvando ? "Publicando…" : "Salvar e publicar"}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] font-medium text-ink-soft">
          vale para todo mundo na hora — sem deploy
        </p>
      </div>
    </div>
  );
}

function Controle({
  rotulo,
  valor,
  min,
  max,
  onChange,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-tight text-ink-soft">{rotulo}</span>
        <span className="font-display text-xs">{valor}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={rotulo}
        className="mt-2 w-full accent-coral"
      />
    </div>
  );
}
