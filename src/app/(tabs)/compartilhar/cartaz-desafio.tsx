"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { EsqueletoCartaz } from "@/components/esqueletos";
import { avatarDeExibicao, AVATAR_FUNDO_PADRAO } from "@/lib/avatares";
import { srcModelo, type Area, type ModeloDesafio } from "@/lib/compartilhar-modelos";
import { Caixa } from "./cartaz-ilustrado";

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

/** "Sua posição" pequeno + "3º lugar" grande, numa linha só. */
function SuaPosicao({ area, base, eu }: { area: Area; base: number; eu: MembroCartaz }) {
  return (
    <Caixa area={area} tinta="escura" base={base} minimo={0.6} alinhar="esquerda">
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
    nome: { x: 31.5, w: 30 },
    pontos: { x: 72.5, w: 15.5 },
    alturaLinha: 3,
    stats: [[8, 81.3, 25, 3], [38.5, 81.3, 24, 3], [68.5, 81.3, 23.5, 3]] as Area[],
    horas: false,
    posicao: [20.5, 90.95, 26, 2.75] as Area,
    restam: [64.5, 90.8, 29, 3.2] as Area,
  },
  "desafio-retro": {
    titulo: [16, 4.3, 70, 10] as Area,
    datas: [19.5, 17.3, 18, 3] as Area,
    livro: [51.5, 17.3, 37.5, 3] as Area,
    sobreLinha: true,
    faixa: [15, 25.9, 37, 3] as Area,
    linhas: [34.8, 42.8, 50.9, 58.9, 66.9],
    avatar: { x: 26, d: 9.5 },
    nome: { x: 33, w: 31 },
    pontos: { x: 72, w: 18 },
    alturaLinha: 3.6,
    stats: [[5, 80.3, 28.5, 4.8], [37.5, 80.3, 26, 4.8], [67.5, 80.3, 28, 4.8]] as Area[],
    horas: true,
    posicao: [17, 89.4, 32, 5.4] as Area,
    restam: [53, 90, 37, 4] as Area,
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
    { circulo: circulo(50, 40.4, 23), nome: [42, 49.7, 16, 2.8] as Area, pontos: [37, 52.7, 26, 5.8] as Area, base: 5.6 },
    { circulo: circulo(21.5, 44.3, 19), nome: [14, 51.8, 14.5, 2.6] as Area, pontos: [9, 54.8, 23, 4.7] as Area, base: 4.6 },
    { circulo: circulo(78, 46.6, 20), nome: [72.5, 53.8, 13.5, 2.3] as Area, pontos: [67.5, 56.4, 24.5, 5.4] as Area, base: 4.6 },
  ];
  const stats: [Area, string][] = [
    [[7.5, 81.4, 19, 4], numero(d.totais.paginas)],
    [[30.5, 81.4, 19, 4], numero(d.totais.livros)],
    [[53, 81.4, 18.5, 4], d.totais.dias],
    [[75.5, 81.4, 18, 4], numero(d.totais.checkins)],
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
          <Linha area={l.nome} base={i === 0 ? 3.4 : 3} className="font-sans font-bold">{nomes[i] ?? "—"}</Linha>
          <Linha area={l.pontos} base={l.base} className="font-display">{top[i] ? numero(top[i].pontos) : "—"}</Linha>
        </div>
      ))}
      {stats.map(([area, valor], i) => (
        <Linha key={i} area={area} base={5} className="font-display">{valor}</Linha>
      ))}
      <Avatar membro={d.eu} estilo={circulo(16.7, 94.2, 12.4)} />
      <SuaPosicao area={[28.5, 91.9, 37, 4.4]} base={4.6} eu={d.eu} />
      <Caixa area={[69.8, 92.3, 19.6, 3.5]} tinta="escura" base={3.6} minimo={0.6}>
        <p className="whitespace-nowrap font-sans text-[0.9em] font-semibold leading-tight">Meta</p>
        <p className="whitespace-nowrap font-display uppercase leading-none">{d.metricaLida}</p>
      </Caixa>
    </>
  );
}

function Lista({ d, layout: L }: { d: DesafioCartaz; layout: (typeof LAYOUT_LISTA)[keyof typeof LAYOUT_LISTA] }) {
  const stats: [Area, string][] = [
    [L.stats[0]!, numero(d.totais.paginas)],
    [L.stats[1]!, numero(d.totais.livros)],
    [L.stats[2]!, L.horas ? d.totais.horas : d.totais.dias],
  ];
  return (
    <>
      <Titulo area={L.titulo} base={6.4} giro={-3}>{d.nome}</Titulo>
      <Linha area={L.datas} base={3} alinhar="esquerda" vertical={L.sobreLinha ? "baixo" : "centro"} className="font-sans font-bold">{d.periodo}</Linha>
      <Linha area={L.livro} base={3.4} alinhar="esquerda" vertical={L.sobreLinha ? "baixo" : "centro"} className="font-serif font-semibold italic">{d.livro}</Linha>
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
            </Linha>
          </div>
        );
      })}
      {stats.map(([area, valor], i) => (
        <Linha key={i} area={area} base={5} className="font-display">{valor}</Linha>
      ))}
      <SuaPosicao area={L.posicao} base={4.8} eu={d.eu} />
      <Linha area={L.restam} base={3.2} className="font-sans font-bold">{d.restam}</Linha>
    </>
  );
}
