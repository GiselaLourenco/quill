import { notFound } from "next/navigation";
import type { CheckinDetalhe } from "../[id]/checkin-card";
import DesafioDetalheClient from "../[id]/detalhe-client";
import { AVATAR_FUNDO_PADRAO } from "@/lib/avatares";
import { addDaysToKey, todayLocalDateKey } from "@/lib/date-br";

/** PRNG com semente — a demo fica igual a cada recarga. */
function criarRand(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Desafio simulado (só em `next dev`): um ano, 10 participantes, check-ins e
 * notas gerados com semente fixa — pra ver a tela cheia sem gravar dado falso
 * no banco de produção. Em produção responde 404.
 */
export default function DesafioDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const hoje = todayLocalDateKey();
  const inicio = `${hoje.slice(0, 4)}-01-01`;
  const fim = `${hoje.slice(0, 4)}-12-31`;

  const rand = criarRand(42);

  const PESSOAS: { id: string; nome: string; ritmo: number }[] = [
    { id: "voce", nome: "Gisela", ritmo: 0.7 },
    { id: "maria", nome: "Maria", ritmo: 0.85 },
    { id: "rafa", nome: "Rafa", ritmo: 0.75 },
    { id: "joao", nome: "João", ritmo: 0.7 },
    { id: "bia", nome: "Bia", ritmo: 0.65 },
    { id: "leo", nome: "Léo", ritmo: 0.6 },
    { id: "ju", nome: "Ju", ritmo: 0.55 },
    { id: "nina", nome: "Nina", ritmo: 0.5 },
    { id: "caio", nome: "Caio", ritmo: 0.4 },
    { id: "aline", nome: "Aline", ritmo: 0.3 },
  ];

  const NOTAS = [
    "Gente, aquela cena do labirinto me destruiu. Precisei parar e respirar.",
    "quase dormi no cap. 3 mas fui até o fim 💪",
    "café + capítulo novo, manhã perfeita ☕",
    "não acredito que ele fez isso. NÃO ACREDITO.",
    "li no ônibus e passei do ponto 🙃",
    "esse autor escreve diálogo como ninguém",
    "terminei! alguém mais chorou no final?",
    "dia corrido, só 10 páginas, mas contou",
    "a reviravolta do cap. 12 valeu o livro inteiro",
    "maratona de domingo, bora!",
  ];

  type Checkin = { userId: string; dia: string; paginas: number; minutos: number; nota: string | null; hora: number };
  const checkins: Checkin[] = [];
  for (let dia = inicio; dia <= hoje; dia = addDaysToKey(dia, 1)) {
    for (const p of PESSOAS) {
      if (rand() > p.ritmo) continue;
      checkins.push({
        userId: p.id,
        dia,
        paginas: 8 + Math.floor(rand() * 55),
        minutos: 15 + Math.floor(rand() * 75),
        nota: rand() < 0.18 ? NOTAS[Math.floor(rand() * NOTAS.length)]! : null,
        hora: 7 + Math.floor(rand() * 16),
      });
    }
  }
  // Hoje: só alguns já leram, e só até a hora atual.
  const horaAgora = new Date().getHours();
  const visiveis = checkins.filter((c) => c.dia < hoje || c.hora <= horaAgora);
  visiveis.sort((a, b) => (a.dia === b.dia ? b.hora - a.hora : a.dia < b.dia ? 1 : -1));

  const pontos = new Map<string, number>();
  for (const c of visiveis) pontos.set(c.userId, (pontos.get(c.userId) ?? 0) + c.paginas);
  const pessoaDe = (id: string) => PESSOAS.find((p) => p.id === id)!;
  const avatar = { avatarUrl: null, avatarZoom: 100, avatarBg: AVATAR_FUNDO_PADRAO };

  const ranking = [...pontos.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([uid, pts], i) => ({
      ...avatar,
      posicao: i + 1,
      userId: uid,
      nome: pessoaDe(uid).nome,
      metrica: `${pts} pág`,
      ehVoce: uid === "voce",
    }));

  const CORES = ["#1d9e75", "#d85a30", "#26215c", "#ef9f27", "#e28d6a", "#69b997", "#6e6887", "#f1ba65", "#0f6e56", "#8a7f6b"];
  const corDe = (uid: string) => CORES[ranking.findIndex((r) => r.userId === uid) % CORES.length]!;
  const membros = ranking.map((r) => ({ userId: r.userId, nome: r.nome, cor: corDe(r.userId), ehVoce: r.ehVoce }));

  const quando = (c: Checkin) => {
    if (c.dia === hoje) {
      const h = horaAgora - c.hora;
      return h < 1 ? "Agora" : `Há ${h}h`;
    }
    const dias = Math.round((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${c.dia}T12:00:00Z`)) / 86_400_000);
    return dias === 1 ? "Ontem" : `${dias} dias atrás`;
  };

  // Cada check-in vira um cartão: livro do momento, nota e (às vezes)
  // comentários de outros membros — pra ver a conversa no feed e no painel do dia.
  const LIVROS = [
    { title: "Mistborn", creator: "Brandon Sanderson", cover_palette: 3 },
    { title: "Circe", creator: "Madeline Miller", cover_palette: 1 },
    { title: "Duna", creator: "Frank Herbert", cover_palette: 2 },
    { title: "Torto Arado", creator: "Itamar Vieira Jr.", cover_palette: 0 },
    { title: "O Nome do Vento", creator: "Patrick Rothfuss", cover_palette: 3 },
    { title: "Pachinko", creator: "Min Jin Lee", cover_palette: 2 },
  ];
  const TAGS = ["flowed", "no_distractions", "phone", "hard"];
  const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  // Página corrida por pessoa (do mais antigo pro mais novo), pra "p. 120 → 148".
  const paginaAtual = new Map<string, number>();
  const inicioPorCheckin = new Map<Checkin, number>();
  for (const c of [...visiveis].reverse()) {
    const p = paginaAtual.get(c.userId) ?? 0;
    inicioPorCheckin.set(c, p % 420);
    paginaAtual.set(c.userId, p + c.paginas);
  }
  const RESPOSTAS = [
    "SIM!! fiquei igual 😭",
    "não me dá spoiler que eu tô no cap. 9",
    "bora que tá quase",
    "que ritmo, hein 🔥",
    "esse livro é bom demais",
    "amanhã eu alcanço vocês",
    "👏👏👏",
  ];
  const detalhes: CheckinDetalhe[] = visiveis.map((c, i) => {
    const livro = LIVROS[(PESSOAS.findIndex((p) => p.id === c.userId) + Math.floor(i / 400)) % LIVROS.length]!;
    const comeco = c.hora * 60 + Math.floor(rand() * 50);
    const pagInicio = inicioPorCheckin.get(c) ?? 0;
    const nRespostas = c.nota ? Math.floor(rand() * 3) : rand() < 0.04 ? 1 : 0;
    const outros = PESSOAS.filter((p) => p.id !== c.userId);
    return {
      id: `demo-${i}`,
      userId: c.userId,
      nome: pessoaDe(c.userId).nome,
      cor: corDe(c.userId),
      dia: c.dia,
      texto: `leu ${c.paginas} pgs`,
      detalhe: `${c.minutos} min · ${livro.title}`,
      sessao: {
        id: `demo-s-${i}`,
        inicio: hhmm(comeco),
        fim: hhmm(comeco + c.minutos),
        minutos: c.minutos,
        paginaInicio: pagInicio,
        paginaFim: pagInicio + c.paginas,
        capituloInicio: null,
        capituloFim: null,
        tags: rand() < 0.6 ? [TAGS[Math.floor(rand() * TAGS.length)]!] : [],
        livro: { id: `demo-${livro.title}`, title: livro.title, creator: livro.creator, cover_kind: "illustrated", cover_url: null, cover_palette: livro.cover_palette },
      },
      nota: c.nota,
      quando: quando(c),
      comentarios: Array.from({ length: nRespostas }, (_, k) => {
        const quem = outros[Math.floor(rand() * outros.length)]!;
        return {
          id: `demo-${i}-${k}`,
          nome: quem.nome,
          cor: corDe(quem.id),
          texto: RESPOSTAS[Math.floor(rand() * RESPOSTAS.length)]!,
          gifUrl: null,
          quando: quando(c),
        };
      }),
    };
  });

  const meusDias = new Set(visiveis.filter((c) => c.userId === "voce").map((c) => c.dia));
  const domingo = addDaysToKey(hoje, -new Date(`${hoje}T12:00:00Z`).getUTCDay());
  const LABEL = ["D", "S", "T", "Q", "Q", "S", "S"];
  const semana = Array.from({ length: 7 }, (_, i) => {
    const chave = addDaysToKey(domingo, i);
    const ehHoje = chave === hoje;
    const feito = meusDias.has(chave);
    return {
      chave,
      data: Number(chave.slice(8, 10)),
      label: LABEL[i]!,
      estado: (ehHoje && feito ? "hoje-feito" : ehHoje ? "hoje" : feito ? "feito" : "vazio") as
        "vazio" | "feito" | "hoje" | "hoje-feito",
    };
  });

  const total = Math.round((Date.parse(`${fim}T12:00:00Z`) - Date.parse(`${inicio}T12:00:00Z`)) / 86_400_000) + 1;
  const passados = Math.round((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${inicio}T12:00:00Z`)) / 86_400_000) + 1;

  return (
    <DesafioDetalheClient
      amigosConvidaveis={[]}
      group={{
        id: "demo",
        nome: "Um ano lendo (demo)",
        metric: "pages",
        unit: "pág",
        diasRestantes: total - passados,
        encerrado: false,
        naoComecou: false,
        comecaEm: inicio,
        progresso: Math.round((passados / total) * 100),
        minhaPosicao: ranking.find((r) => r.ehVoce)?.posicao ?? 0,
        codigoConvite: "DEMO2026",
        metricaLabel: "Páginas",
        duracaoDias: total,
      }}
      semana={semana}
      ranking={ranking}
      checkins={detalhes}
      livros={[]}
      membros={membros}
      demo
    />
  );
}
