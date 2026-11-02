"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { AppImage } from "@/components/app-image";
import { Portal } from "@/components/portal";
import { NIVEL_COR, NIVEL_NOME, type ConquistaView } from "@/lib/conquistas";

const LARGURA_STORY = 1080;
const ALTURA_STORY = 1920;
const LARGURA_BASE = 384;

/**
 * As artes de /img/conquistas têm muita margem transparente (o desenho ocupa
 * ~⅓ do quadro de 512px), então são ampliadas dentro do quadrado — que corta
 * a sobra. Fotos de prêmio (avatar) já vêm cheias e entram quase inteiras.
 */
function escalaDaArte(src: string): number {
  return src.startsWith("/img/conquistas/") ? 1.6 : 0.92;
}

/** Quadrado da conquista: cor do nível + arte. Bloqueada fica cinza e tracejada. */
export function ConquistaIcone({
  c,
  tamanho,
  className = "",
}: {
  c: ConquistaView;
  tamanho: number;
  className?: string;
}) {
  const arte = Math.round(tamanho * escalaDaArte(c.icone));
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 ${
        c.desbloqueada ? "border-ink" : "border-dashed border-ink-soft"
      } ${className}`}
      style={{
        width: tamanho,
        height: tamanho,
        background: c.desbloqueada ? NIVEL_COR[c.nivel] : "#e9dfc6",
      }}
    >
      <AppImage
        slot={`conquista.${c.id}`}
        src={c.icone}
        alt=""
        aria-hidden
        width={arte}
        height={arte}
        className={`object-contain ${c.desbloqueada ? "" : "opacity-45 grayscale"}`}
        style={{ width: arte, height: arte }}
      />
    </span>
  );
}

export function BarraProgresso({ c, fina = false }: { c: ConquistaView; fina?: boolean }) {
  const pct = Math.min(100, Math.round((c.progresso / c.alvo) * 100));
  return (
    <div
      className={`w-full overflow-hidden rounded-full border-ink bg-paper ${
        fina ? "h-[7px] border-[1.5px]" : "h-2.5 border-2"
      }`}
    >
      <div className="h-full bg-moss" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Detalhe da conquista, de baixo pra cima, por cima da tela de onde veio
 * (perfil ou /conquistas). Fecha no botão, tocando fora ou no Esc.
 */
export function ConquistaSheet({ c, onClose }: { c: ConquistaView; onClose: () => void }) {
  const cartazRef = useRef<HTMLDivElement>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  async function compartilhar() {
    if (!cartazRef.current) return;
    setGerando(true);
    setErro(null);
    try {
      const dataUrl = await toPng(cartazRef.current, {
        width: LARGURA_STORY,
        height: ALTURA_STORY,
        pixelRatio: 1,
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `quill-conquista-${c.id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Quill · ${c.titulo}` });
        return;
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `quill-conquista-${c.id}.png`;
      a.click();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setErro("Não deu pra gerar a imagem. Tenta de novo.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={c.titulo}
          className="flex w-full max-w-[430px] animate-[subir_.28s_cubic-bezier(.2,.8,.2,1)] flex-col items-center gap-3.5 rounded-t-[22px] border-t-2 border-ink bg-paper px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 text-center"
        >
          <span className="h-[5px] w-11 rounded-full bg-ink-soft/50" aria-hidden />
          <ConquistaIcone c={c} tamanho={132} className="shadow-hard mt-1 !rounded-[22px]" />
          <span
            className="rounded-full border-[1.5px] border-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: NIVEL_COR[c.nivel] }}
          >
            {NIVEL_NOME[c.nivel]}
          </span>
          <h2 className="font-display text-xl uppercase leading-tight tracking-tight">{c.titulo}</h2>
          <p className="max-w-[30ch] font-serif text-sm italic">{c.descricao}</p>

          <div className="grid w-full gap-1.5">
            {c.desbloqueada ? (
              <p className="text-xs font-bold text-moss-dark">
                ✓ Desbloqueada{c.desbloqueadaEm ? ` em ${c.desbloqueadaEm}` : " agora"}
              </p>
            ) : (
              <>
                <div className="flex justify-between text-xs font-bold">
                  <span>Seu progresso</span>
                  <span className="tabular-nums">
                    {c.progresso}/{c.alvo} {c.unidade}
                  </span>
                </div>
                <BarraProgresso c={c} />
              </>
            )}
          </div>

          {c.desbloqueada ? (
            <button
              type="button"
              onClick={compartilhar}
              disabled={gerando}
              className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-mustard p-3 text-xs font-bold uppercase tracking-wide transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
            >
              {gerando ? "Gerando imagem…" : "Compartilhar nos Stories"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-card p-3 text-xs font-bold uppercase tracking-wide transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Fechar
            </button>
          )}
          {erro && <p className="text-xs font-bold text-coral">{erro}</p>}
        </div>

        {/* Nó oculto 1080×1920 que o html-to-image rasteriza (ver /compartilhar). */}
        {c.desbloqueada && (
          <div aria-hidden className="pointer-events-none fixed left-[-20000px] top-0 h-0 overflow-hidden">
            <div ref={cartazRef} style={{ width: LARGURA_STORY, height: ALTURA_STORY }}>
              <div
                style={{
                  width: LARGURA_BASE,
                  height: LARGURA_BASE * (16 / 9),
                  transform: `scale(${LARGURA_STORY / LARGURA_BASE})`,
                  transformOrigin: "top left",
                }}
              >
                <CartazConquista c={c} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Portal>
  );
}

/** Card de Stories da conquista — mesmo quadro do cartaz de retrospectiva. */
function CartazConquista({ c }: { c: ConquistaView }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden bg-navy p-6">
      <div className="absolute -left-6 top-10 h-20 w-20 rounded-full border-2 border-mustard/60" />
      <div className="absolute -right-3 top-44 h-10 w-10 rotate-12 border-2 border-ink bg-coral" />
      <div className="absolute bottom-28 left-8 h-6 w-6 rounded-full border-2 border-ink bg-moss" />

      <span className="relative mt-6 font-display text-[10px] uppercase tracking-[0.25em] text-mustard">
        Conquista desbloqueada
      </span>

      <div className="relative flex flex-col items-center gap-4">
        <div
          className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-[28px] border-2 border-ink"
          style={{ background: NIVEL_COR[c.nivel], boxShadow: "6px 6px 0 0 #2c2c2a" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image precisa de <img> simples */}
          <img
            src={c.icone}
            alt=""
            className="max-w-none object-contain"
            style={{ width: 176 * escalaDaArte(c.icone), height: 176 * escalaDaArte(c.icone) }}
          />
        </div>
        <span
          className="rounded-full border-2 border-ink px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink"
          style={{ background: NIVEL_COR[c.nivel] }}
        >
          {NIVEL_NOME[c.nivel]}
        </span>
        <h2 className="text-center font-display text-3xl uppercase leading-none text-paper">{c.titulo}</h2>
        <p className="max-w-[26ch] text-center font-serif text-base italic text-paper/75">{c.descricao}</p>
      </div>

      <p className="relative mb-2 font-display text-[10px] uppercase tracking-[0.25em] text-paper/40">
        Quill{c.desbloqueadaEm ? ` · ${c.desbloqueadaEm}` : ""}
      </p>
    </div>
  );
}
