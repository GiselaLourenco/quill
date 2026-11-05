"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { EsqueletoCartaz } from "@/components/esqueletos";
import { avatarDeExibicao, AVATAR_FUNDO_PADRAO } from "@/lib/avatares";
import { srcModelo, type Area, type ModeloDesafio } from "@/lib/compartilhar-modelos";
import { Caixa, pos } from "./cartaz-ilustrado";

export type MembroCartaz = {
  nome: string;
  avatarUrl: string | null;
  avatarZoom: number;
  avatarBg: string;
  pontos: number;
  /** Empate divide a posição (1º, 1º, 3º). 0 = ainda sem pontos. */
  posicao: number;
  eu: boolean;
};

export type DesafioCartaz = {
  id: string;
  nome: string;
  /** "1 out – 30 nov" */
  periodo: string;
  /** "faltam 25 dias", "encerrado"… */
  restam: string;
  encerrado: boolean;
  /** Título do livro único, ou "Livro livre". */
  livro: string;
  metricaRotulo: string;
  /** "Páginas lidas", "Dias lidos"… */
  metricaLida: string;
  /** Unidade dos pontos, singular e plural: ["página", "páginas"]. */
  unidade: [string, string];
  pessoas: number;
  ranking: MembroCartaz[];
  eu: MembroCartaz;
  totais: { paginas: number; livros: number; dias: string; checkins: number; horas: string };
};

/** Até 9.999 o número inteiro; daí pra cima, arredondado ("12,3 mil"). */
function numero(v: number): string {
  if (v < 10000) return v.toLocaleString("pt-BR");
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

/** No pódio cabe só o primeiro nome; repetido, ganha a inicial do sobrenome. */
function nomesCurtos(nomes: string[]): string[] {
  const partes = nomes.map((n) => n.trim().split(/\s+/));
  return partes.map((p, i) => {
    const repetido = partes.some((q, j) => j !== i && q[0] === p[0]);
    return repetido && p[1] ? `${p[0]} ${p[1][0]}.` : p[0]!;
  });
}

/** "páginas", ou "página" quando o número é 1. */
const unidadeDe = (d: DesafioCartaz, n: number) => (n === 1 ? d.unidade[0] : d.unidade[1]);

const posicaoTexto = (m: MembroCartaz) => (m.posicao > 0 ? `${m.posicao}º lugar` : "sem pontos");

/** Centro (x, y) e diâmetro em % da largura → caixa do círculo. */
const circulo = (cx: number, cy: number, d: number): React.CSSProperties => ({
  left: `${cx - d / 2}%`,
  top: `${cy - (d * 9) / 16 / 2}%`,
  width: `${d}%`,
  aspectRatio: "1",
});

function Avatar({ membro, estilo }: { membro: MembroCartaz | undefined; estilo: React.CSSProperties }) {
  if (!membro) return null;
  const arte = avatarDeExibicao(membro.avatarUrl);
  return (
    <div
      className="absolute overflow-hidden rounded-full"
      style={{ ...estilo, backgroundColor: membro.avatarBg || AVATAR_FUNDO_PADRAO }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image precisa de <img> simples pra rasterizar */}
      <img
        src={arte.src}
        alt=""
        crossOrigin="anonymous"
        draggable={false}
        className={`h-full w-full ${arte.foto ? "object-cover" : "object-contain"}`}
        style={{ transform: `scale(${membro.avatarZoom / 100})` }}
      />
    </div>
  );
}

/** Texto que encolhe até caber, em uma linha. Nunca corta. */
function Linha({
  area,
  base,
  className = "",
  alinhar,
  vertical,
  clara,
  children,
}: {
  area: Area;
  base: number;
  className?: string;
  alinhar?: "centro" | "esquerda";
  /** "baixo": senta sobre a linha desenhada no pé da área. */
  vertical?: "centro" | "baixo";
  clara?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Caixa area={area} tinta={clara ? "clara" : "escura"} base={base} minimo={0.6} alinhar={alinhar} vertical={vertical}>
      <p className={`whitespace-nowrap leading-none ${className}`}>{children}</p>
    </Caixa>
  );
}

function Titulo({ area, base, giro, children }: { area: Area; base: number; giro: number; children: string }) {
  return (
    <Caixa area={area} tinta="escura" base={base} minimo={0.6} estilo={{ transform: `rotate(${giro}deg)` }}>
      <p className="font-display uppercase leading-[1.02]">{children}</p>
    </Caixa>
  );
}

/** "Meta" pequeno em cima da métrica do ranking ("Páginas lidas"). */
function Meta({ area, base, metrica, clara }: { area: Area; base: number; metrica: string; clara?: boolean }) {
  return (
    <Caixa area={area} tinta={clara ? "clara" : "escura"} base={base} minimo={0.6}>
      <p className="whitespace-nowrap font-sans text-[0.75em] font-semibold leading-tight">Meta</p>
      <p className="whitespace-nowrap font-display uppercase leading-none">{metrica}</p>
    </Caixa>
  );
}

/** "Sua posição" pequeno em cima, "3º lugar" grande embaixo. */
function SuaPosicao({ area, base, eu, clara }: { area: Area; base: number; eu: MembroCartaz; clara?: boolean }) {
  return (
    <Caixa area={area} tinta={clara ? "clara" : "escura"} base={base} minimo={0.6} alinhar="esquerda">
      <p className="whitespace-nowrap font-sans text-[0.55em] font-medium leading-tight">Sua posição</p>
      <p className="whitespace-nowrap font-sans font-extrabold italic leading-none">{posicaoTexto(eu)}</p>
    </Caixa>
  );
}

const LAYOUT_LISTA = {
  "desafio-placar": {
    titulo: [16, 8.1, 52, 5.9] as Area,
    datas: [20, 17.8, 27, 2.8] as Area,
    livro: [62.5, 17.8, 27.5, 2.8] as Area,
    sobreLinha: false,
    faixa: null as Area | null,
    linhas: [31.2, 38.8, 46.4, 53.9, 61.6],
    avatar: { x: 25.5, d: 7.8 },
    nome: { x: 31.5, w: 27 },
    pontos: { x: 59.5, w: 32 },
    alturaLinha: 3,
    stats: [[8, 81.6, 25, 3.4], [38.5, 81.6, 24, 3.4], [68.5, 81.6, 23.5, 3.4]] as Area[],
    rotulos: null as Area[] | null,
    /** Faixa colorida de cada card: ícone recortado da arte + rótulo, centralizados. */
    faixas: [[8, 75.9, 24, 4.3], [38.4, 75.9, 23.8, 4.3], [68.7, 75.9, 23.7, 4.3]] as Area[] | null,
    horas: false,
    /** Sem as pílulas creme (apagadas da arte): texto claro direto na barra escura. */
    posicao: [19.5, 89.4, 27.5, 5.4] as Area,
    meta: [64.5, 89.4, 28.5, 5.4] as Area,
    rodapeClaro: true,
  },
  "desafio-retro": {
    titulo: [21, 5.2, 58, 7.4] as Area,
    datas: [19.5, 18.4, 18, 2.8] as Area,
    livro: [51.5, 18.1, 37, 2.8] as Area,
    sobreLinha: false,
    faixa: [15, 25.9, 37, 3] as Area,
    linhas: [34.8, 42.8, 50.9, 58.9, 66.9],
    avatar: { x: 26, d: 9.5 },
    nome: { x: 33, w: 31 },
    pontos: { x: 65.5, w: 25.5 },
    alturaLinha: 3.6,
    stats: [[5, 80.6, 28.5, 4.6], [37.5, 80.6, 26, 4.6], [67.5, 80.6, 28, 4.6]] as Area[],
    rotulos: [[13, 77, 19, 2.6], [45.5, 77, 17, 2.6], [75.5, 77, 18, 2.6]] as Area[] | null,
    faixas: null as Area[] | null,
    horas: true,
    posicao: [18, 89.9, 28, 4.6] as Area,
    meta: [57, 89.6, 31, 4.6] as Area,
    rodapeClaro: false,
  },
};

/**
 * Cartaz de desafio por cima de uma ilustração (pódio ou ranking). Como no
 * cartaz do mês, fontes em `cqw` com auto-ajuste: a tela e o PNG 1080×1920
 * saem iguais, e nada é cortado — texto longo só fica menor.
 */
export function CartazDesafio({ modelo, desafio }: { modelo: ModeloDesafio; desafio: DesafioCartaz }) {
  const [carregada, setCarregada] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Imagem que já estava no cache pode terminar antes do onLoad ser ligado.
  useLayoutEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setCarregada(true);
  }, []);

  const d = desafio;

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden bg-paper" style={{ containerType: "inline-size" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image precisa de <img> simples pra rasterizar */}
      <img
        ref={imgRef}
        src={srcModelo(modelo.id)}
        alt=""
        draggable={false}
        onLoad={() => setCarregada(true)}
        className="absolute inset-0 h-full w-full select-none object-cover"
      />
      {!carregada && <EsqueletoCartaz />}

      <div className={carregada ? "" : "invisible"}>
        {modelo.id === "desafio-podio" ? <Podio d={d} /> : <Lista d={d} layout={LAYOUT_LISTA[modelo.id]} />}
      </div>
    </div>
  );
}

function Podio({ d }: { d: DesafioCartaz }) {
  const top = d.ranking.slice(0, 3);
  const nomes = nomesCurtos(top.map((m) => m.nome));
  // 1º no meio (mais alto), 2º à esquerda, 3º à direita.
  const lugares = [
    { circulo: circulo(50, 40.4, 23), nome: [42, 49.25, 15.5, 2.4] as Area, pontos: [37, 52.7, 26, 5.8] as Area, base: 5.6 },
    { circulo: circulo(21.5, 44.3, 19), nome: [14, 51.4, 14.3, 2.2] as Area, pontos: [9, 54.8, 23, 4.7] as Area, base: 4.6 },
    { circulo: circulo(78, 46.6, 20), nome: [72.3, 53.3, 14.3, 2.2] as Area, pontos: [67.5, 56.4, 24.5, 5.4] as Area, base: 4.6 },
  ];
  const stats: [Area, string, string][] = [
    [[7.5, 81.2, 19, 4.4], numero(d.totais.paginas), "Páginas"],
    [[30.5, 81.2, 19, 4.4], numero(d.totais.livros), "Livros"],
    [[53, 81.2, 18.5, 4.4], d.totais.dias, "Dias"],
    [[75.5, 81.2, 18, 4.4], numero(d.totais.checkins), "Check-ins"],
  ];
  return (
    <>
      <Titulo area={[11, 8.8, 76, 9.8]} base={7.2} giro={-3.5}>{d.nome}</Titulo>
      <Linha area={[17, 22.4, 66, 4.2]} base={3.6} className="font-sans font-bold">
        {d.periodo} · {d.restam}
      </Linha>
      {lugares.map((l, i) => (
        <div key={i}>
          <Avatar membro={top[i]} estilo={l.circulo} />
          {/* Pílula do nome desenhada aqui (a da arte foi apagada) pra ter respiro até o total. */}
          <div
            className="absolute rounded-[1.2cqw] border-[0.45cqw] border-ink bg-[#F8E6C7] shadow-[0.5cqw_0.5cqw_0_0_#1d1d1b]"
            style={pos(l.nome)}
            aria-hidden
          />
          <Linha area={l.nome} base={i === 0 ? 3.4 : 3} className="font-sans font-bold">{nomes[i] ?? "—"}</Linha>
          <Caixa area={l.pontos} tinta="escura" base={l.base} minimo={0.6}>
            <p className="whitespace-nowrap font-display leading-none">{top[i] ? numero(top[i].pontos) : "—"}</p>
            {top[i] && (
              <p className="whitespace-nowrap font-sans text-[0.4em] font-bold uppercase leading-tight tracking-wide opacity-70">
                {unidadeDe(d, top[i].pontos)}
              </p>
            )}
          </Caixa>
        </div>
      ))}
      {stats.map(([area, valor, rotulo], i) => (
        <Caixa key={i} area={area} tinta="escura" base={4.6} minimo={0.6}>
          <p className="whitespace-nowrap font-display text-[0.42em] uppercase leading-tight tracking-wide opacity-75">{rotulo}</p>
          <p className="whitespace-nowrap font-display leading-none">{valor}</p>
        </Caixa>
      ))}
      <Avatar membro={d.eu} estilo={circulo(16.7, 94.2, 12.4)} />
      <SuaPosicao area={[29.5, 91.3, 35.5, 5.2]} base={9} eu={d.eu} />
      <Meta area={[70.3, 92.75, 18.6, 2.75]} base={4.2} metrica={d.metricaLida} />
    </>
  );
}

function Lista({ d, layout: L }: { d: DesafioCartaz; layout: (typeof LAYOUT_LISTA)[keyof typeof LAYOUT_LISTA] }) {
  const stats: [Area, string][] = [
    [L.stats[0]!, numero(d.totais.paginas)],
    [L.stats[1]!, numero(d.totais.livros)],
    [L.stats[2]!, L.horas ? d.totais.horas : d.totais.dias],
  ];
  const rotulos = ["Páginas", "Livros", L.horas ? "Horas" : "Dias"];
  return (
    <>
      <Titulo area={L.titulo} base={6.4} giro={-3}>{d.nome}</Titulo>
      <Linha area={L.datas} base={3} alinhar="esquerda" vertical={L.sobreLinha ? "baixo" : "centro"} className="font-sans font-bold">{d.periodo}</Linha>
      <Linha area={L.livro} base={3.4} alinhar="esquerda" vertical={L.sobreLinha ? "baixo" : "centro"} className="font-sans font-bold">{d.restam}</Linha>
      {L.faixa && (
        <Linha area={L.faixa} base={3} alinhar="esquerda" clara className="font-display uppercase tracking-[0.1em]">
          Ranking · {d.metricaRotulo}
        </Linha>
      )}
      {L.linhas.map((y, i) => {
        const m = d.ranking[i];
        const topo = y - L.alturaLinha / 2;
        return (
          <div key={i} style={m ? undefined : { opacity: 0.35 }}>
            <Avatar membro={m} estilo={circulo(L.avatar.x, y, L.avatar.d)} />
            <Linha
              area={[L.nome.x, topo, L.nome.w, L.alturaLinha]}
              base={3.8}
              alinhar="esquerda"
              className={`font-sans font-bold ${m?.eu ? "underline underline-offset-[0.2em]" : ""}`}
            >
              {m ? m.nome : "—"}
            </Linha>
            <Linha area={[L.pontos.x, topo, L.pontos.w, L.alturaLinha]} base={3.6} className="font-display">
              {m ? numero(m.pontos) : "—"}
              {m && <span className="ml-[0.3em] font-sans text-[0.6em] font-bold lowercase opacity-70">{unidadeDe(d, m.pontos)}</span>}
            </Linha>
          </div>
        );
      })}
      {stats.map(([area, valor], i) => (
        <Linha key={i} area={area} base={5} className="font-display">{valor}</Linha>
      ))}
      {L.faixas?.map((area, i) => (
        <Caixa key={`f${i}`} area={area} tinta="clara" base={3.4} minimo={0.6}>
          <p className="inline-flex items-center gap-[0.4em] whitespace-nowrap font-display uppercase leading-none tracking-wide">
            {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image precisa de <img> simples pra rasterizar */}
            <img src={`/img/compartilhar/modelos/desafio-placar-icone-${i + 1}.webp`} alt="" className="h-[1.9em] w-[2em] object-contain" draggable={false} />
            {rotulos[i]}
          </p>
        </Caixa>
      ))}
      {L.rotulos?.map((area, i) => (
        <Linha key={`r${i}`} area={area} base={3} alinhar="esquerda" clara className="font-display uppercase tracking-wide">
          {rotulos[i]}
        </Linha>
      ))}
      <SuaPosicao area={L.posicao} base={6} eu={d.eu} clara={L.rodapeClaro} />
      <Meta area={L.meta} base={5} metrica={d.metricaLida} clara={L.rodapeClaro} />
    </>
  );
}
