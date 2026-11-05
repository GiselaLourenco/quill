import { notFound } from "next/navigation";
import { AVATARES, AVATAR_FUNDOS } from "@/lib/avatares";
import CompartilharClient from "../compartilhar-client";
import type { DesafioCartaz, MembroCartaz } from "../cartaz-desafio";

/**
 * Compartilhar com desafios simulados (só em `next dev`): um de 10 pessoas
 * por páginas, um de livro único por capítulos e um encerrado — pra ver os
 * cartazes cheios sem gravar dado falso no banco. Em produção responde 404.
 */
export default function CompartilharDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const pessoa = (nome: string, i: number, pontos: number, eu = false): Omit<MembroCartaz, "posicao"> => ({
    nome,
    pontos,
    eu,
    avatarUrl: AVATARES[i % AVATARES.length]!.src,
    avatarZoom: 100,
    avatarBg: AVATAR_FUNDOS[i % AVATAR_FUNDOS.length]!,
  });

  // Mesma regra da tela do desafio: empate divide a posição.
  const ranquear = (membros: Omit<MembroCartaz, "posicao">[]): MembroCartaz[] => {
    const ordenados = [...membros].sort((a, b) => b.pontos - a.pontos || Number(b.eu) - Number(a.eu));
    return ordenados.map((m) => ({ ...m, posicao: ordenados.findIndex((o) => o.pontos === m.pontos) + 1 }));
  };

  const dez = ranquear([
    pessoa("Maria Clara", 0, 3412),
    pessoa("Rafa", 1, 2980),
    pessoa("João Pedro", 2, 2755),
    pessoa("Gisela", 3, 2310, true),
    pessoa("Bia", 4, 2104),
    pessoa("Léo", 5, 1876),
    pessoa("Ju", 0, 1530),
    pessoa("Nina", 1, 1288),
    pessoa("Caio", 2, 902),
    pessoa("Aline", 3, 455),
  ]);

  const livroUnico = ranquear([
    pessoa("Bia", 4, 48),
    pessoa("Nina", 1, 48),
    pessoa("Gisela", 3, 41, true),
    pessoa("Rafa", 1, 22),
  ]);

  const desafios: DesafioCartaz[] = [
    {
      id: "demo-10",
      nome: "Clube das 10: quem lê mais em novembro",
      periodo: "1 – 30 nov",
      restam: "faltam 25 dias",
      encerrado: false,
      livro: "Livro livre",
      metricaRotulo: "Páginas",
      metricaLida: "Páginas lidas",
      pessoas: 10,
      ranking: dez,
      eu: dez.find((m) => m.eu)!,
      totais: { paginas: dez.reduce((s, m) => s + m.pontos, 0), livros: 17, dias: "6/30", checkins: 214, horas: "312h" },
    },
    {
      id: "demo-duna",
      nome: "Leitura coletiva de Duna",
      periodo: "1 out – 31 dez",
      restam: "faltam 56 dias",
      encerrado: false,
      livro: "Duna",
      metricaRotulo: "Capítulos",
      metricaLida: "Capítulos lidos",
      pessoas: 4,
      ranking: livroUnico,
      eu: livroUnico.find((m) => m.eu)!,
      totais: { paginas: 2130, livros: 3, dias: "36/92", checkins: 64, horas: "71h" },
    },
    {
      id: "demo-fim",
      nome: "Maratona de setembro",
      periodo: "1 – 30 set",
      restam: "encerrado",
      encerrado: true,
      livro: "Livro livre",
      metricaRotulo: "Dias ativos",
      metricaLida: "Dias lidos",
      pessoas: 10,
      ranking: ranquear(dez.map((m, i) => ({ ...m, pontos: 30 - i * 2 - (i % 3) }))),
      eu: { ...dez.find((m) => m.eu)!, pontos: 23, posicao: 4 },
      totais: { paginas: 18450, livros: 22, dias: "30/30", checkins: 241, horas: "402h" },
    },
  ];

  // A aba "Meu mês" precisa de pelo menos um mês; aqui ele vem zerado.
  const mesVazio = {
    id: "2026-11",
    rotulo: "Novembro 2026",
    minutos: "0",
    paginas: "0",
    diasLidos: "0/30",
    horaOuro: "—",
    temDados: false,
    livros: [],
    livrosDeAtividade: false,
    numeros: { minutos: 0, paginas: 0, diasLidos: 0 },
    livrosTerminados: 0,
    notaMedia: null,
    meta: null,
    maiorSequencia: 0,
  };

  return <CompartilharClient periodos={[mesVazio]} todosLivros={[]} desafios={desafios} />;
}
