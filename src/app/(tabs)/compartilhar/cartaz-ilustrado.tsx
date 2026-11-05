"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { EsqueletoCartaz } from "@/components/esqueletos";
import { COR_TINTA, srcModelo, type Area, type ModeloIlustrado, type Tinta } from "@/lib/compartilhar-modelos";
import type { LivroCartaz, PeriodoStats } from "./compartilhar-client";

/**
 * Cartaz por cima de uma ilustração: cada texto é posicionado de forma
 * absoluta nas áreas (em %) do modelo. Os tamanhos de fonte são em `cqw`
 * (fração da largura do cartaz), então o mesmo componente sai idêntico no
 * cartaz da tela e no nó de 1080×1920 que vira PNG.
 */
export function CartazIlustrado({
  modelo,
  periodo,
  livro,
  mes,
  ano,
  contornos = false,
  aoCarregar,
}: {
  modelo: ModeloIlustrado;
  periodo: PeriodoStats;
  livro: LivroCartaz | undefined;
  mes: string | undefined;
  ano: string | undefined;
  /** Contorno vermelho em cada área — só pra rota de debug. */
  contornos?: boolean;
  aoCarregar?: () => void;
}) {
  const [carregada, setCarregada] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Imagem que já estava no cache pode terminar antes do onLoad ser ligado.
  useLayoutEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setCarregada(true);
      aoCarregar?.();
    }
  }, [aoCarregar]);

  const n = periodo.numeros;
  const stats = [
    { valor: n.minutos > 0 ? n.minutos.toLocaleString("pt-BR") : "—", rotulo: "Minutos lidos", ok: n.minutos > 0 },
    { valor: n.paginas > 0 ? n.paginas.toLocaleString("pt-BR") : "—", rotulo: "Páginas", ok: n.paginas > 0 },
    { valor: n.diasLidos > 0 ? periodo.diasLidos : "—", rotulo: "Dias lidos", ok: n.diasLidos > 0 },
    { valor: periodo.horaOuro, rotulo: "Horário de ouro", ok: periodo.horaOuro !== "—" },
  ];

  const nota = periodo.notaMedia != null ? periodo.notaMedia.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : null;
  const meta = periodo.meta;
  const mesMinusculo = mes?.toLowerCase() ?? "";
  const destaque =
    periodo.livrosTerminados > 0
      ? {
          grande: String(periodo.livrosTerminados),
          legenda: `${periodo.livrosTerminados === 1 ? "livro terminado" : "livros terminados"} em ${mesMinusculo}`,
          legendaCurta: periodo.livrosTerminados === 1 ? "livro terminado" : "livros terminados",
          rodape: nota ? `nota média ★ ${nota}` : meta ? `${meta.atual} de ${meta.alvo} no ano` : null,
        }
      : meta
        ? { grande: `${meta.atual} de ${meta.alvo}`, legenda: `livros na meta de ${ano ?? ""}`, legendaCurta: `meta de ${ano ?? ""}`, rodape: null }
        : { grande: "—", legenda: `nenhum livro terminado em ${mesMinusculo}`, legendaCurta: "livros terminados", rodape: null };

  const extras = [
    { valor: periodo.livrosTerminados > 0 ? String(periodo.livrosTerminados) : "—", rotulo: "Livros terminados" },
    { valor: meta ? `${meta.atual}/${meta.alvo}` : "—", rotulo: "Meta do ano" },
    { valor: nota ? `★ ${nota}` : "—", rotulo: "Nota média" },
    {
      valor: periodo.maiorSequencia > 0 ? String(periodo.maiorSequencia) : "—",
      rotulo: periodo.maiorSequencia === 1 ? "Dia seguido" : "Dias seguidos",
    },
  ];

  const tituloComAno = !modelo.ano;

  return (
    <div
      className="relative aspect-[9/16] w-full overflow-hidden bg-paper"
      style={{ containerType: "inline-size" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image precisa de <img> simples pra rasterizar */}
      <img
        ref={imgRef}
        src={srcModelo(modelo.id)}
        alt=""
        draggable={false}
        onLoad={() => {
          setCarregada(true);
          aoCarregar?.();
        }}
        className="absolute inset-0 h-full w-full select-none object-cover"
      />

      {!carregada && <EsqueletoCartaz />}

      <div className={carregada ? "" : "invisible"}>
        {/* título */}
        <Caixa area={modelo.titulo.area} tinta={modelo.titulo.tinta} base={11} contorno={contornos}>
          <p className="font-display text-[0.28em] uppercase tracking-[0.25em] opacity-70">Retrospectiva</p>
          <p className="whitespace-nowrap font-display uppercase leading-none">{mes}</p>
          {tituloComAno && <p className="mt-[0.08em] font-serif text-[0.42em] italic leading-none opacity-80">{ano}</p>}
        </Caixa>

        {modelo.ano && (
          <Caixa area={modelo.ano.area} tinta={modelo.ano.tinta} base={4.5} contorno={contornos}>
            <p className="whitespace-nowrap font-display uppercase leading-none tracking-[0.2em]">{ano}</p>
          </Caixa>
        )}

        {/* stats nas caixas */}
        {modelo.stats?.map((area, i) => {
          const s = stats[i]!;
          return (
            <Caixa key={i} area={area} tinta="escura" base={7.5} contorno={contornos}>
              <p className="whitespace-nowrap font-display leading-none">{s.valor}</p>
              <p className="mt-[0.2em] font-sans text-[0.34em] font-bold uppercase leading-tight tracking-wide opacity-70">
                {s.rotulo}
              </p>
            </Caixa>
          );
        })}

        {/* checklist (mesa-polaroid): ✓ no quadradinho já desenhado */}
        {modelo.statsLista && (
          <ListaStats modelo={modelo} stats={stats} contornos={contornos} />
        )}

        {/* extras (trilha-outono) */}
        {modelo.extras?.map((area, i) => {
          const e = extras[i]!;
          return (
            <Caixa key={i} area={area} tinta="escura" base={7} contorno={contornos}>
              <p className="whitespace-nowrap font-display leading-none">{e.valor}</p>
              <p className="mt-[0.2em] font-sans text-[0.34em] font-bold uppercase leading-tight tracking-wide opacity-70">
                {e.rotulo}
              </p>
            </Caixa>
          );
        })}

        {/* destaque */}
        {modelo.destaque &&
          (modelo.destaque.pautas ? (
            <DestaquePautado modelo={modelo} destaque={destaque} contornos={contornos} />
          ) : (
            <Caixa area={modelo.destaque.area} tinta={modelo.destaque.tinta} base={13} contorno={contornos}>
              <p className="whitespace-nowrap font-display leading-none">{destaque.grande}</p>
              <p className="mt-[0.25em] font-serif text-[0.3em] italic leading-tight opacity-80">{destaque.legenda}</p>
              {destaque.rodape && (
                <p className="mt-[0.5em] whitespace-nowrap font-display text-[0.19em] uppercase tracking-wide opacity-80">
                  {destaque.rodape}
                </p>
              )}
            </Caixa>
          ))}

        {/* livro do período */}
        <LivroDoPeriodo modelo={modelo} livro={livro} contornos={contornos} />
      </div>
    </div>
  );
}

const pos = ([x, y, w, h]: Area): React.CSSProperties => ({
  left: `${x}%`,
  top: `${y}%`,
  width: `${w}%`,
  height: `${h}%`,
});

/**
 * Área com auto-ajuste: começa em `base` cqw e encolhe até o conteúdo caber
 * (sem estourar largura nem altura). Os filhos medem em `em`, então tudo
 * encolhe junto.
 */
function Caixa({
  area,
  tinta,
  base,
  minimo = base * 0.3,
  alinhar = "centro",
  vertical = "centro",
  contorno,
  className = "",
  children,
}: {
  area: Area;
  tinta: Tinta;
  base: number;
  minimo?: number;
  alinhar?: "centro" | "esquerda";
  /** "baixo": o texto senta no pé da área (sobre uma pauta). */
  vertical?: "centro" | "baixo";
  contorno?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useAutoAjuste(base, minimo);
  return (
    <div
      ref={ref}
      // Filhos sem encolher e alinhamento "safe": o que não cabe estoura pra
      // baixo/direita, onde scrollHeight/scrollWidth enxergam e o ajuste reage.
      className={`absolute flex flex-col overflow-hidden px-[0.35em] [&>*]:shrink-0 ${
        alinhar === "centro" ? "items-center text-center" : "items-start text-left"
      } ${className}`}
      style={{
        ...pos(area),
        color: COR_TINTA[tinta],
        fontSize: `${base}cqw`,
        justifyContent: vertical === "baixo" ? "safe flex-end" : "safe center",
        alignItems: alinhar === "centro" ? "safe center" : "flex-start",
        outline: contorno ? "2px solid red" : undefined,
        outlineOffset: -2,
        textShadow: tinta === "clara" ? "0 1px 3px rgba(0,0,0,0.45)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function useAutoAjuste(base: number, minimo: number) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ajustar = () => {
      let tam = base;
      el.style.fontSize = `${tam}cqw`;
      while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && tam > minimo) {
        tam = Math.max(minimo, tam * 0.92);
        el.style.fontSize = `${tam}cqw`;
      }
    };
    ajustar();
    // A fonte de display pode chegar depois: mede de novo com ela.
    let vivo = true;
    document.fonts?.ready.then(() => vivo && ajustar());
    return () => {
      vivo = false;
    };
  });
  return ref;
}

function ListaStats({
  modelo,
  stats,
  contornos,
}: {
  modelo: ModeloIlustrado;
  stats: { valor: string; rotulo: string; ok: boolean }[];
  contornos: boolean;
}) {
  const lista = modelo.statsLista!;
  const h = lista.area[3];
  const direita = lista.area[0] + lista.area[2];
  const alturaLinha = h / lista.caixas.length;
  return (
    <>
      {lista.caixas.map(([cx, cy], i) => {
        const s = stats[i]!;
        const esquerda = cx + 3;
        return (
          <div key={i}>
            {s.ok && (
              <span
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center font-display leading-none"
                style={{ left: `${cx}%`, top: `${cy}%`, fontSize: "6cqw", color: "#C0532A" }}
              >
                ✓
              </span>
            )}
            <Caixa
              area={[esquerda, cy - alturaLinha / 2, direita - esquerda, alturaLinha]}
              tinta={lista.tinta}
              base={6}
              alinhar="esquerda"
              contorno={contornos}
            >
              <p className="whitespace-nowrap leading-none">
                <span className="font-display">{s.valor}</span>{" "}
                <span className="font-sans text-[0.5em] font-bold uppercase tracking-wide opacity-70">{s.rotulo}</span>
              </p>
            </Caixa>
          </div>
        );
      })}
      {contornos && (
        <div className="absolute" style={{ ...pos(lista.area), outline: "1px dashed red" }} aria-hidden />
      )}
    </>
  );
}

function DestaquePautado({
  modelo,
  destaque,
  contornos,
}: {
  modelo: ModeloIlustrado;
  destaque: { grande: string; legendaCurta: string; rodape: string | null };
  contornos: boolean;
}) {
  const d = modelo.destaque!;
  const [x, yArea, w] = d.area;
  const pautas = d.pautas!;
  // Cada linha de texto senta sobre uma pauta desenhada; a de cima vai do
  // topo do cartão até a 1ª pauta.
  const linhas = [destaque.grande, destaque.legendaCurta, destaque.rodape ?? ""];
  return (
    <>
      {pautas.map((yPauta, i) => {
        const topo = i === 0 ? yArea + 1.5 : pautas[i - 1]! + 0.6;
        const area: Area = [x + 3, topo, w - 6, yPauta - topo - 0.3];
        const texto = linhas[i];
        if (!texto) return null;
        return (
          <Caixa key={i} area={area} tinta={d.tinta} base={i === 0 ? 11 : i === 1 ? 5.2 : 4} contorno={contornos} vertical="baixo">
            <p
              className={`whitespace-nowrap leading-none ${
                i === 0 ? "font-display" : i === 1 ? "font-serif italic" : "font-display uppercase tracking-wide"
              }`}
            >
              {texto}
            </p>
          </Caixa>
        );
      })}
    </>
  );
}

function LivroDoPeriodo({
  modelo,
  livro,
  contornos,
}: {
  modelo: ModeloIlustrado;
  livro: LivroCartaz | undefined;
  contornos: boolean;
}) {
  const l = modelo.livro;
  const [x, y, w, h] = l.area;
  const recuo = (w * l.margemEsq) / 100;
  const area: Area = [x + recuo, y, w - recuo, h];
  return (
    <>
      {l.cartao && (
        <div
          className="absolute rounded-[3cqw] border-[0.35cqw] border-[#E2C9AE] bg-[#F7ECDD]"
          style={pos(l.area)}
          aria-hidden
        />
      )}
      <Caixa
        area={area}
        tinta={l.tinta}
        base={6.5}
        minimo={2.4}
        alinhar="esquerda"
        contorno={contornos}
        className="px-[0.8em] py-[0.3em]"
      >
        <p className="font-display text-[0.38em] uppercase tracking-[0.2em] opacity-60">Livro do período</p>
        {livro ? (
          <>
            <p className="mt-[0.15em] line-clamp-3 font-serif font-bold italic leading-[1.1]">{livro.titulo}</p>
            {livro.autor && (
              <p className="mt-[0.15em] line-clamp-1 font-serif text-[0.55em] italic opacity-75">{livro.autor}</p>
            )}
            {livro.nota ? (
              <p className="mt-[0.15em] text-[0.55em] leading-none" style={{ color: "#C0532A" }}>
                {"★".repeat(livro.nota)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-[0.2em] font-serif text-[0.6em] italic opacity-60">Nenhum livro escolhido</p>
        )}
      </Caixa>
    </>
  );
}
