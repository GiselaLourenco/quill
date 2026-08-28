"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AJUSTE_PADRAO, estiloDoAjuste, type MapaAjustes, type MapaSlots } from "@/lib/ajustes-imagem";
import { BotaoRemoverArte, FolhaSlot } from "@/components/editor-imagens";
import { rotuloDoSlot, SLOTS_FORA_DO_APP } from "@/lib/slots-imagem";
import { enviarArte, limparSlotImagem, restaurarArte } from "@/app/actions/admin";

type Acao = (input: { path: string; zoom: number; posX: number; posY: number }) => Promise<{ error: string | null }>;

export default function AdminClient({
  artes,
  ocultas,
  ajustes,
  slots,
  onSalvar,
  onLimpar,
}: {
  artes: string[];
  ocultas: string[];
  ajustes: MapaAjustes;
  slots: MapaSlots;
  onSalvar: Acao;
  onLimpar: (path: string) => Promise<{ error: string | null }>;
}) {
  const router = useRouter();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [slotAberto, setSlotAberto] = useState<{ slot: string; padrao: string; enquadra: boolean } | null>(null);
  const especiais = SLOTS_FORA_DO_APP.map((e) => e.slot) as readonly string[];
  const personalizados = Object.keys(slots).filter((s) => !especiais.includes(s)).sort();

  return (
    <div className="min-h-full bg-paper px-5 pb-10 pt-6">
      <header className="mb-5">
        <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-ink">
          Ajustar imagens
        </h1>
        <p className="mt-2 text-[13px] font-medium text-ink/75">
          O ajuste vale para o app inteiro assim que você salva — o arquivo não muda.
          Nas telas, use o botão <strong>editar artes</strong> e toque no lápis de cada imagem.
        </p>
      </header>

      <section className="mb-7">
        <h2 className="font-display text-sm uppercase tracking-tight text-ink">Pontos do app</h2>
        <p className="mt-1 text-[12px] font-medium text-ink/70">
          Estes dois não dá para editar pelo lápis: um não é imagem na tela, o outro
          aparece antes do login.
        </p>
        <ul className="mt-3 space-y-2">
          {SLOTS_FORA_DO_APP.map((especial) => {
            const cfg = slots[especial.slot];
            const src = cfg?.src ?? especial.padrao;
            return (
              <li key={especial.slot}>
                <button
                  type="button"
                  onClick={() =>
                    setSlotAberto({
                      slot: especial.slot,
                      padrao: especial.padrao,
                      enquadra: especial.enquadra,
                    })
                  }
                  className="shadow-hard-sm flex w-full items-center gap-3 rounded-md border-2 border-ink bg-card p-3 text-left active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-ink bg-paper">
                    <Image src={src} alt="" width={44} height={44} className="h-full w-full object-contain" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xs uppercase tracking-tight">
                      {especial.rotulo}
                    </span>
                    <span className="block truncate text-[10px] font-bold uppercase text-ink-soft">
                      {src.split("/").pop()}
                    </span>
                  </span>
                  <span className="font-display text-[10px] uppercase text-moss">
                    {cfg ? "trocado" : "padrão"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {personalizados.length > 0 && (
        <section className="mb-7">
          <h2 className="font-display text-sm uppercase tracking-tight text-ink">
            Pontos já ajustados
          </h2>
          <p className="mt-1 text-[12px] font-medium text-ink/70">
            Para mexer de novo, abra a tela e use o lápis. Aqui dá para voltar ao padrão.
          </p>
          <ul className="mt-3 space-y-2">
            {personalizados.map((slot) => (
              <li
                key={slot}
                className="flex items-center gap-3 rounded-md border-2 border-ink bg-card p-3"
              >
                {slots[slot].src && (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-ink bg-paper">
                    <Image src={slots[slot].src} alt="" width={36} height={36} className="h-full w-full object-contain" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xs uppercase tracking-tight">
                    {rotuloDoSlot(slot)}
                  </span>
                  <span className="block truncate text-[10px] font-bold uppercase text-ink-soft">
                    {slot}
                  </span>
                </span>
                <RestaurarSlot slot={slot} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-2 flex items-end justify-between gap-3">
        <h2 className="font-display text-sm uppercase tracking-tight text-ink">
          Todas as artes
        </h2>
        <EnviarArte />
      </div>
      <p className="mb-3 text-[12px] font-medium text-ink/70">
        Tudo que existe na pasta do app, mais o que você enviar por aqui — {artes.length} no total.
        O <strong>×</strong> tira a arte da galeria: enviada por você, some de vez; vinda do
        código, só sai da lista e volta aqui embaixo.
      </p>

      <ul className="grid grid-cols-3 gap-3">
        {artes.map((path) => {
          const a = ajustes[path];
          return (
            <li key={path} className="relative">
              <button
                type="button"
                onClick={() => setSelecionada(path)}
                className="shadow-hard-sm w-full overflow-hidden rounded-md border-2 border-ink bg-card p-2 text-left active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                <span className="flex aspect-square items-center justify-center overflow-hidden bg-paper">
                  <Image
                    src={path}
                    alt=""
                    width={120}
                    height={120}
                    className="h-full w-full object-contain"
                    style={estiloDoAjuste(a)}
                  />
                </span>
                <span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-tight text-ink-soft">
                  {path.split("/").pop()}
                </span>
                {a && (
                  <span className="mt-0.5 block text-[9px] font-bold uppercase text-moss">
                    ajustada
                  </span>
                )}
              </button>
              <BotaoRemoverArte arte={path} onRemovida={() => router.refresh()} />
            </li>
          );
        })}
      </ul>

      {ocultas.length > 0 && (
        <section className="mt-7">
          <h2 className="font-display text-sm uppercase tracking-tight text-ink">
            Artes escondidas
          </h2>
          <p className="mt-1 text-[12px] font-medium text-ink/70">
            Elas continuam no app, só não aparecem na galeria de escolha.
          </p>
          <ul className="mt-3 space-y-2">
            {ocultas.map((path) => (
              <li
                key={path}
                className="flex items-center gap-3 rounded-md border-2 border-ink/40 bg-card p-2"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-ink/40 bg-paper">
                  <Image src={path} alt="" width={32} height={32} className="h-full w-full object-contain opacity-60" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase text-ink-soft">
                  {path.split("/").pop()}
                </span>
                <MostrarArte path={path} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {slotAberto && (
        <FolhaSlot
          slot={slotAberto.slot}
          padrao={slotAberto.padrao}
          config={slots[slotAberto.slot]}
          catalogo={artes}
          enquadra={slotAberto.enquadra}
          onFechar={() => setSlotAberto(null)}
        />
      )}

      {selecionada && (
        <Editor
          path={selecionada}
          inicial={ajustes[selecionada] ?? AJUSTE_PADRAO}
          onSalvar={onSalvar}
          onLimpar={onLimpar}
          onFechar={() => setSelecionada(null)}
        />
      )}
    </div>
  );
}

function RestaurarSlot({ slot }: { slot: string }) {
  const router = useRouter();
  const [limpando, startLimpar] = useTransition();
  return (
    <button
      type="button"
      disabled={limpando}
      onClick={() =>
        startLimpar(async () => {
          await limparSlotImagem(slot);
          router.refresh();
        })
      }
      className="shrink-0 rounded-md border-2 border-ink bg-paper px-2 py-1.5 font-display text-[10px] uppercase tracking-tight disabled:opacity-60"
    >
      {limpando ? "…" : "restaurar"}
    </button>
  );
}

function Editor({
  path,
  inicial,
  onSalvar,
  onLimpar,
  onFechar,
}: {
  path: string;
  inicial: { zoom: number; posX: number; posY: number };
  onSalvar: Acao;
  onLimpar: (path: string) => Promise<{ error: string | null }>;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [zoom, setZoom] = useState(inicial.zoom);
  const [posX, setPosX] = useState(inicial.posX);
  const [posY, setPosY] = useState(inicial.posY);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSave] = useTransition();
  const arrasto = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);

  const aoPegar = (e: React.PointerEvent<HTMLElement>) => {
    const caixa = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 px-4 pb-6">
      <div className="shadow-hard max-h-[88vh] w-full max-w-[390px] overflow-y-auto rounded-md border-2 border-ink bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="min-w-0 font-display text-lg uppercase leading-none tracking-tight">
            <span className="block truncate">{path.split("/").pop()}</span>
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

        {/* Prévia no mesmo formato em que a arte mais aparece: círculo.
            A posição se ajusta arrastando aqui dentro — sliders de horizontal
            e vertical eram chute e não mostravam o que estava acontecendo. */}
        <div className="flex justify-center">
          <div
            onPointerDown={aoPegar}
            onPointerMove={aoMover}
            onPointerUp={aoSoltar}
            onPointerCancel={aoSoltar}
            onKeyDown={aoTeclar}
            role="application"
            tabIndex={0}
            aria-label="Arraste para reposicionar a imagem"
            className="shadow-hard flex h-36 w-36 cursor-grab touch-none items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-paper active:cursor-grabbing"
          >
            <Image
              src={path}
              alt=""
              width={144}
              height={144}
              draggable={false}
              className="h-full w-full select-none object-contain"
              style={estiloDoAjuste({ zoom, posX, posY })}
            />
          </div>
        </div>
        <p className="mt-2 text-center font-serif text-xs italic text-ink-soft">
          Arraste a imagem para reposicionar.
        </p>

        <Controle rotulo="Zoom" valor={zoom} min={50} max={300} sufixo="%" onChange={setZoom} />
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

        {erro && <p className="mt-3 text-sm font-medium text-coral">{erro}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() =>
              startSave(async () => {
                const r = await onLimpar(path);
                if (r.error) { setErro(r.error); return; }
                router.refresh();
                onFechar();
              })
            }
            className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-paper py-3 font-display text-xs uppercase tracking-tight active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            Restaurar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={() =>
              startSave(async () => {
                const r = await onSalvar({
                  path,
                  zoom: Math.round(zoom),
                  posX: Math.round(posX),
                  posY: Math.round(posY),
                });
                if (r.error) { setErro(r.error); return; }
                router.refresh();
                onFechar();
              })
            }
            className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-moss py-3 font-display text-xs uppercase tracking-tight text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Controle({
  rotulo,
  valor,
  min,
  max,
  sufixo,
  onChange,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  sufixo: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-tight text-ink-soft">{rotulo}</span>
        <span className="font-display text-xs">{valor}{sufixo}</span>
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

const limitar = (v: number) => Math.min(100, Math.max(0, v));

/** Devolve para a galeria uma arte do código que estava escondida. */
function MostrarArte({ path }: { path: string }) {
  const router = useRouter();
  const [voltando, startVolta] = useTransition();
  return (
    <button
      type="button"
      disabled={voltando}
      onClick={() =>
        startVolta(async () => {
          await restaurarArte(path);
          router.refresh();
        })
      }
      className="shrink-0 rounded-md border-2 border-ink bg-paper px-2 py-1.5 font-display text-[10px] uppercase tracking-tight disabled:opacity-60"
    >
      {voltando ? "…" : "mostrar"}
    </button>
  );
}

/**
 * Sobe uma arte nova sem deploy. Vai para o Storage (em produção o disco é só
 * leitura) e aparece na galeria junto com as artes de /public.
 */
function EnviarArte() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startEnvio] = useTransition();

  return (
    <label
      className={`shadow-hard-sm shrink-0 cursor-pointer rounded-md border-2 border-ink bg-mustard px-3 py-2 font-display text-[10px] uppercase tracking-tight ${
        enviando ? "opacity-60" : ""
      }`}
      title={erro ?? undefined}
    >
      {enviando ? "enviando…" : erro ? "erro — tentar de novo" : "+ enviar imagem"}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
        disabled={enviando}
        className="sr-only"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (!arquivo) return;
          setErro(null);
          const dados = new FormData();
          dados.append("arquivo", arquivo);
          startEnvio(async () => {
            const r = await enviarArte(dados);
            if (r.error) {
              setErro(r.error);
              return;
            }
            router.refresh();
          });
        }}
      />
    </label>
  );
}
