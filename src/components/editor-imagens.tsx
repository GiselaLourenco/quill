"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AJUSTE_PADRAO, type MapaSlots, type SlotImagem } from "@/lib/ajustes-imagem";
import { rotuloDoSlot } from "@/lib/slots-imagem";
import { enviarArte, limparSlotImagem, removerArte, salvarSlotImagem } from "@/app/actions/admin";
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
 * Roda `medir` agora e sempre que a tela puder ter mexido: scroll (inclusive o
 * do container interno, por isso captura), resize, e um pulso lento para o que
 * escapa dos eventos (imagem que acabou de carregar, animação).
 */
function useRemedir(ativo: boolean, medir: () => void) {
  useEffect(() => {
    if (!ativo) return;
    let raf = 0;
    const rodar = () => {
      raf = 0;
      medir();
    };
    const agendar = () => {
      if (!raf) raf = requestAnimationFrame(rodar);
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
  }, [ativo, medir]);
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

  // Os lápis seguem as imagens da tela.
  const medir = useCallback(() => {
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
  }, []);

  useRemedir(modo, medir);

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

      {modo && !alvo && (
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

const limitar = (v: number) => Math.min(100, Math.max(0, v));

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
  const [enviadas, setEnviadas] = useState<string[]>([]);
  const [removidas, setRemovidas] = useState<string[]>([]);
  const [salvando, startSave] = useTransition();
  const [enviando, startEnvio] = useTransition();

  // Guarda a posição do início do arrasto — o movimento é sempre relativo a
  // ela, não ao último frame, para não acumular erro de arredondamento.
  const arrasto = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);

  // A imagem na própria tela acompanha os controles — o editor mostra o
  // resultado no lugar real, não só na miniatura aqui dentro.
  useEffect(() => {
    onPrevia?.({ slot, src, zoom, posX, posY });
  }, [onPrevia, slot, src, zoom, posX, posY]);

  const srcVisivel = src ?? padrao;

  /**
   * Arrasto do mouse (ou do dedo): converte o quanto o ponteiro andou em
   * porcentagem do tamanho da caixa. Vale tanto na miniatura daqui quanto em
   * cima da imagem de verdade na tela — as duas movem o mesmo tanto.
   */
  const aoPegar = (e: React.PointerEvent<HTMLElement>) => {
    const alvo = e.currentTarget;
    const caixa = alvo.getBoundingClientRect();
    alvo.setPointerCapture(e.pointerId);
    arrasto.current = { px: posX, py: posY, x: e.clientX, y: e.clientY, w: caixa.width, h: caixa.height };
  };

  const aoMover = (e: React.PointerEvent<HTMLElement>) => {
    const a = arrasto.current;
    if (!a || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.preventDefault();
    setPosX(limitar(a.px + ((e.clientX - a.x) / a.w) * 100));
    setPosY(limitar(a.py + ((e.clientY - a.y) / a.h) * 100));
  };

  const aoSoltar = () => {
    arrasto.current = null;
  };

  // Setas do teclado: mesmo ajuste, para quem não quer mira fina no mouse.
  const aoTeclar = (e: React.KeyboardEvent) => {
    const passo = e.shiftKey ? 5 : 1;
    const mapa: Record<string, [number, number]> = {
      ArrowLeft: [-passo, 0],
      ArrowRight: [passo, 0],
      ArrowUp: [0, -passo],
      ArrowDown: [0, passo],
    };
    const d = mapa[e.key];
    if (!d) return;
    e.preventDefault();
    setPosX((v) => limitar(v + d[0]));
    setPosY((v) => limitar(v + d[1]));
  };

  const estilo = {
    transform: `translate(${posX - 50}%, ${posY - 50}%) scale(${zoom / 100})`,
  };

  const artes = useMemo(() => {
    const vistas = new Set<string>();
    const fora = new Set(removidas);
    return [...enviadas, ...catalogo].filter(
      (a) => !fora.has(a) && !vistas.has(a) && vistas.add(a),
    );
  }, [enviadas, catalogo, removidas]);

  const aoEscolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    const dados = new FormData();
    dados.append("arquivo", arquivo);
    startEnvio(async () => {
      const r = await enviarArte(dados);
      if (r.error || !r.url) {
        setErro(r.error ?? "Não foi possível enviar a imagem.");
        return;
      }
      setEnviadas((atuais) => [r.url as string, ...atuais]);
      setSrc(r.url);
    });
  };

  return (
    <>
      {/* Fundo de leve, não escuro: o ponto é continuar vendo a arte na tela
          enquanto ela é arrastada. */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="fixed inset-0 z-[76] cursor-default bg-ink/25"
      />

      {enquadra && <AlvoNaTela slot={slot} aoPegar={aoPegar} aoMover={aoMover} aoSoltar={aoSoltar} />}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pb-6">
        <div className="shadow-hard pointer-events-auto max-h-[80vh] w-full max-w-[390px] overflow-y-auto rounded-md border-2 border-ink bg-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="min-w-0">
              <span className="block truncate font-display text-base uppercase leading-none tracking-tight">
                {rotuloDoSlot(slot)}
              </span>
              <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-tight text-ink-soft">
                {slot} · {nomeCurto(srcVisivel)}
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
            <div
              onPointerDown={enquadra ? aoPegar : undefined}
              onPointerMove={enquadra ? aoMover : undefined}
              onPointerUp={enquadra ? aoSoltar : undefined}
              onPointerCancel={enquadra ? aoSoltar : undefined}
              onKeyDown={enquadra ? aoTeclar : undefined}
              role={enquadra ? "application" : undefined}
              tabIndex={enquadra ? 0 : undefined}
              aria-label={enquadra ? "Arraste para reposicionar a imagem" : undefined}
              className={`shadow-hard flex h-28 w-28 shrink-0 touch-none items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-paper ${
                enquadra ? "cursor-grab active:cursor-grabbing" : ""
              }`}
            >
              <Image
                src={srcVisivel}
                alt=""
                width={112}
                height={112}
                draggable={false}
                className="h-full w-full select-none object-contain"
                style={enquadra ? estilo : undefined}
              />
            </div>
            <p className="font-serif text-xs italic leading-snug text-ink-soft">
              {enquadra
                ? "Arraste a imagem — aqui ou direto na tela atrás, dentro do tracejado. O que você vê já é o resultado."
                : "O ícone é gerado a partir desta arte, recortada em quadrado."}
            </p>
          </div>

          {enquadra && (
            <>
              <Controle rotulo="Zoom" valor={zoom} min={50} max={300} onChange={setZoom} />
              <button
                type="button"
                onClick={() => {
                  setPosX(AJUSTE_PADRAO.posX);
                  setPosY(AJUSTE_PADRAO.posY);
                  setZoom(AJUSTE_PADRAO.zoom);
                }}
                className="mt-3 rounded-md border-2 border-ink/25 bg-paper px-2.5 py-1.5 font-display text-[10px] uppercase tracking-tight text-ink-soft"
              >
                centralizar
              </button>
            </>
          )}

          <div className="mt-5 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-tight text-ink-soft">
              Trocar imagem
            </p>
            <span className="text-[10px] font-bold uppercase text-ink-soft">
              {artes.length} artes
            </span>
          </div>
          <p className="mt-1 text-[10px] font-medium leading-tight text-ink-soft">
            O × tira a arte da galeria: enviada por você, some de vez; vinda do código,
            só sai da lista e volta pelo /admin.
          </p>
          <div className="mt-2 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1">
            <label
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-ink/40 bg-paper p-1 text-center text-[9px] font-bold uppercase leading-tight text-ink-soft ${
                enviando ? "opacity-60" : ""
              }`}
            >
              <span className="text-base leading-none">＋</span>
              {enviando ? "enviando…" : "enviar"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                onChange={aoEscolherArquivo}
                disabled={enviando}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => setSrc(null)}
              className={`flex aspect-square items-center justify-center rounded-md border-2 p-1 text-center text-[9px] font-bold uppercase leading-tight ${
                src === null ? "border-coral bg-paper text-coral" : "border-ink/25 bg-paper text-ink-soft"
              }`}
            >
              arte padrão
            </button>
            {artes.map((arte) => (
              <div key={arte} className="relative">
                <button
                  type="button"
                  onClick={() => setSrc(arte)}
                  aria-label={nomeCurto(arte)}
                  title={nomeCurto(arte)}
                  className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-2 bg-paper p-1 ${
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
                <BotaoRemoverArte
                  arte={arte}
                  onRemovida={() => {
                    setRemovidas((atuais) => [...atuais, arte]);
                    setEnviadas((atuais) => atuais.filter((a) => a !== arte));
                    setSrc((atual) => (atual === arte ? null : atual));
                  }}
                />
              </div>
            ))}
          </div>

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
                  const r = await salvarSlotImagem({
                    slot,
                    src,
                    zoom: Math.round(zoom),
                    posX: Math.round(posX),
                    posY: Math.round(posY),
                  });
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
    </>
  );
}

/**
 * A área de arrasto por cima da imagem de verdade, quando ela está na tela.
 * É o que permite reposicionar olhando o resultado no tamanho real, em vez de
 * mirar na miniatura.
 */
function AlvoNaTela({
  slot,
  aoPegar,
  aoMover,
  aoSoltar,
}: {
  slot: string;
  aoPegar: (e: React.PointerEvent<HTMLElement>) => void;
  aoMover: (e: React.PointerEvent<HTMLElement>) => void;
  aoSoltar: () => void;
}) {
  const [caixa, setCaixa] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const medir = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`[data-slot="${CSS.escape(slot)}"]`);
    if (!el) {
      setCaixa(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      setCaixa(null);
      return;
    }
    setCaixa({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, [slot]);

  useRemedir(true, medir);

  if (!caixa) return null;

  return (
    <div
      onPointerDown={aoPegar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      style={{ left: caixa.x, top: caixa.y, width: caixa.w, height: caixa.h }}
      className="fixed z-[78] touch-none cursor-grab rounded-sm border-2 border-dashed border-coral active:cursor-grabbing"
      aria-hidden
    />
  );
}

/**
 * O × de cada arte da galeria, com confirmação em cima da própria miniatura —
 * remover é o tipo de clique que não pode acontecer sem querer.
 */
export function BotaoRemoverArte({
  arte,
  onRemovida,
}: {
  arte: string;
  onRemovida: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState(false);
  const [removendo, startRemocao] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        aria-label={`Remover ${nomeCurto(arte)}`}
        title={`Remover ${nomeCurto(arte)}`}
        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-paper bg-ink text-[10px] font-bold leading-none text-paper"
      >
        ×
      </button>

      {confirmando && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md border-2 border-coral bg-paper/95 p-1 text-center">
          <span className="text-[8px] font-bold uppercase leading-tight text-ink">
            {erro ? "não deu" : removendo ? "removendo…" : "remover?"}
          </span>
          {!removendo && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() =>
                  startRemocao(async () => {
                    const r = await removerArte(arte);
                    if (r.error) {
                      setErro(true);
                      return;
                    }
                    setConfirmando(false);
                    onRemovida();
                  })
                }
                className="rounded border border-coral bg-coral px-1.5 py-0.5 text-[8px] font-bold uppercase text-paper"
              >
                sim
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmando(false);
                  setErro(false);
                }}
                className="rounded border border-ink/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-ink-soft"
              >
                não
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Nome curto de uma arte, para caber no editor. */
function nomeCurto(src: string) {
  return src.split("/").pop() ?? src;
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
        <span className="font-display text-xs">{Math.round(valor)}%</span>
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
