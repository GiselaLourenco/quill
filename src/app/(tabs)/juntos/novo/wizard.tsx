"use client";

import { useRouter } from "next/navigation";
import { useRef, useMemo, useState } from "react";
import { createChallenge } from "@/app/actions/groups";

type UnidadeDuracao = "semana" | "mes" | "ano";
type Duracao = "1_semana" | "2_semanas" | "1_mes" | "3_meses" | "1_ano" | "custom";
type Metrica = "active_days" | "pages" | "chapters" | "check_ins" | "minutes";
type Amigo = { id: string; nome: string; inicial: string };

const DURACOES: { id: Exclude<Duracao, "custom">; label: string; hint: string; valor: number; unidade: UnidadeDuracao }[] = [
  { id: "1_semana", label: "1 semana", hint: "7 dias", valor: 1, unidade: "semana" },
  { id: "1_mes", label: "1 mês", hint: "30 dias", valor: 1, unidade: "mes" },
  { id: "1_ano", label: "1 ano", hint: "365 dias", valor: 1, unidade: "ano" },
];

const METRICAS: { id: Metrica; label: string; checkin: string }[] = [
  { id: "active_days", label: "DIAS", checkin: "Basta fazer check-in do dia" },
  { id: "pages", label: "Páginas", checkin: "Vamos perguntar quantas páginas você leu" },
  { id: "chapters", label: "Capítulos", checkin: "Vamos perguntar quantos capítulos você concluiu" },
  { id: "check_ins", label: "Livros terminados", checkin: "Só marca ao terminar um livro" },
];

const PASSOS = [
  { n: 1, label: "Básico" },
  { n: 2, label: "Regras" },
  { n: 3, label: "Convidar" },
] as const;

const UNIDADES: { id: UnidadeDuracao; label: string; labelPlural: string; dias: number }[] = [
  { id: "semana", label: "semana", labelPlural: "semanas", dias: 7 },
  { id: "mes", label: "mês", labelPlural: "meses", dias: 30 },
  { id: "ano", label: "ano", labelPlural: "anos", dias: 365 },
];

function duracaoDias(d: Duracao, valor: number, unidade: UnidadeDuracao): number {
  if (d === "custom") {
    const dias = (UNIDADES.find((u) => u.id === unidade)?.dias ?? 30) * Math.max(1, valor);
    // Mín. 1 semana · máx. 1 ano, como diz a legenda do passo.
    return Math.min(365, Math.max(7, dias));
  }
  if (d === "1_semana") return 7;
  if (d === "2_semanas") return 14;
  if (d === "1_mes") return 30;
  if (d === "3_meses") return 90;
  return 365;
}

function gerarCodigo() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function NovoDesafioWizard({ amigos }: { amigos: Amigo[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [passo, setPasso] = useState<1 | 2 | 3>(1);

  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState<Duracao>("1_mes");
  const [customValor, setCustomValor] = useState(1);
  const [customUnidade, setCustomUnidade] = useState<UnidadeDuracao>("mes");
  const [metrica, setMetrica] = useState<Metrica>("active_days");
  const [codigo] = useState(gerarCodigo);
  const [copiado, setCopiado] = useState(false);
  const [convidados, setConvidados] = useState<Set<string>>(new Set());
  const [participarRanking, setParticiparRanking] = useState(true);

  const podeAvancar = passo === 1 ? nome.trim().length >= 2 : true;

  const passoInfo = useMemo(() => {
    if (passo === 1) return { titulo: "Passo 01 de 03", sub: "Nome e duração do desafio" };
    if (passo === 2) return { titulo: "Passo 02 de 03", sub: "Como o placar vai contar" };
    return { titulo: "Passo 03 de 03", sub: "Compartilhe o código ou convide direto" };
  }, [passo]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch { setCopiado(false); }
  };

  const toggleAmigo = (id: string) => {
    setConvidados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hoje = new Date().toISOString().slice(0, 10);
  const fim = new Date();
  fim.setDate(fim.getDate() + duracaoDias(duracao, customValor, customUnidade));
  const fimStr = fim.toISOString().slice(0, 10);

  const proximo = () => {
    if (!podeAvancar) return;
    if (passo < 3) { setPasso((p) => (p + 1) as 1 | 2 | 3); return; }
    if (formRef.current) {
      const form = formRef.current;
      (form.elements.namedItem("name") as HTMLInputElement).value = nome.trim();
      (form.elements.namedItem("scoring_metric") as HTMLInputElement).value = metrica;
      (form.elements.namedItem("starts_at") as HTMLInputElement).value = hoje;
      (form.elements.namedItem("ends_at") as HTMLInputElement).value = fimStr;
      // O código exibido no passo 3 é o que a pessoa copia e compartilha —
      // então é ele que precisa ser gravado. Antes o banco gerava outro por
      // conta própria e o código divulgado não encontrava o desafio.
      (form.elements.namedItem("invite_code") as HTMLInputElement).value = codigo;
      const competesEl = form.elements.namedItem("competes") as HTMLInputElement | null;
      if (competesEl) competesEl.value = participarRanking ? "on" : "";
      form.requestSubmit();
    }
  };

  const voltar = () => {
    if (passo === 1) router.push("/juntos");
    else setPasso((p) => (p - 1) as 1 | 2 | 3);
  };

  return (
    <div className="flex h-full flex-col bg-paper">
      <form ref={formRef} action={createChallenge} className="hidden" aria-hidden>
        <input name="name" defaultValue="" />
        <input name="scoring_metric" defaultValue="" />
        <input name="starts_at" defaultValue="" />
        <input name="ends_at" defaultValue="" />
        <input name="invite_code" defaultValue="" />
        <input name="competes" defaultValue="" />
      </form>

      <header className="border-b-2 border-ink bg-navy px-5 pt-5 pb-6">
        <div className="mb-4 flex items-center justify-end">
          <button aria-label="Fechar" onClick={() => router.push("/juntos")} className="text-xl font-bold text-paper">×</button>
        </div>
        <h1 className="font-display text-3xl uppercase leading-tight text-paper">{passoInfo.titulo}</h1>
        <p className="mt-2 text-[12px] font-medium text-paper/80">{passoInfo.sub}</p>
        <ol className="mt-5 flex gap-2">
          {PASSOS.map((p) => {
            const done = p.n < passo;
            const active = p.n === passo;
            return (
              <li key={p.n} className="flex flex-1 items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center border-2 border-ink font-display text-[10px] ${active ? "bg-mustard text-ink shadow-[2px_2px_0_0_var(--color-coral)]" : done ? "bg-moss text-paper" : "bg-paper text-ink/50"}`}>
                  {done ? "✓" : p.n}
                </span>
                <span className={`font-display text-[10px] uppercase tracking-widest ${active ? "text-paper" : "text-paper/60"}`}>{p.label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
        {passo === 1 && (
          <Passo1
            nome={nome}
            onNome={setNome}
            duracao={duracao}
            onDuracao={setDuracao}
            customValor={customValor}
            onCustomValor={setCustomValor}
            customUnidade={customUnidade}
            onCustomUnidade={setCustomUnidade}
          />
        )}
        {passo === 2 && <Passo2 metrica={metrica} onMetrica={setMetrica} />}
        {passo === 3 && <Passo3 codigo={codigo} copiado={copiado} onCopiar={copiar} convidados={convidados} onToggleAmigo={toggleAmigo} participar={participarRanking} onParticipar={setParticiparRanking} amigos={amigos} />}
      </div>

      <footer className="border-t-2 border-ink bg-paper px-5 py-4">
        <div className="flex gap-3">
          <button onClick={voltar} className="flex-1 border-2 border-ink bg-paper py-3 font-display text-xs uppercase tracking-widest text-ink shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            {passo === 1 ? "Cancelar" : "Voltar"}
          </button>
          <button onClick={proximo} disabled={!podeAvancar} className="flex-[2] border-2 border-ink bg-moss py-3 font-display text-xs uppercase tracking-widest text-paper shadow-hard-sm disabled:cursor-not-allowed disabled:bg-ink-soft disabled:opacity-70 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            {passo === 3 ? "Criar desafio" : "Próximo passo"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function Passo1({
  nome, onNome, duracao, onDuracao, customValor, onCustomValor, customUnidade, onCustomUnidade,
}: {
  nome: string;
  onNome: (v: string) => void;
  duracao: Duracao;
  onDuracao: (v: Duracao) => void;
  customValor: number;
  onCustomValor: (v: number) => void;
  customUnidade: UnidadeDuracao;
  onCustomUnidade: (v: UnidadeDuracao) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <label className="block font-display text-xs uppercase tracking-widest text-ink">Nome do desafio</label>
        <input value={nome} onChange={(e) => onNome(e.target.value.slice(0, 60))} placeholder="Ex: Setembro clássico" maxLength={60} className="w-full border-2 border-ink bg-paper px-3 py-3 font-serif text-lg italic text-ink shadow-hard-sm placeholder:text-ink/30 focus:outline-none focus:shadow-hard" />
        <p className="text-right text-[10px] text-ink-soft">{nome.length}/60</p>
      </div>
      <div className="space-y-3">
        <label className="block font-display text-xs uppercase tracking-widest text-ink">Duração</label>
        <div className="grid grid-cols-3 gap-3">
          {DURACOES.map((d) => {
            const sel = duracao === d.id;
            return (
              <button key={d.id} type="button" onClick={() => { onDuracao(d.id); onCustomValor(d.valor); onCustomUnidade(d.unidade); }} className={`flex flex-col items-center border-2 border-ink px-2 py-3 font-display text-xs uppercase tracking-wider ${sel ? "translate-x-[2px] translate-y-[2px] bg-mustard text-ink shadow-none" : "bg-paper text-ink shadow-hard-sm"}`}>
                <span className="leading-none">{d.label}</span>
                <span className="mt-1 text-[9px] font-medium normal-case text-ink-soft">{d.hint}</span>
              </button>
            );
          })}
        </div>
        {/* Box personalizado: valor + unidade */}
        <div className="shadow-hard-sm rounded-md border-2 border-ink bg-mustard p-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { onCustomValor(Math.max(1, customValor - 1)); onDuracao("custom"); }}
              className="h-12 w-12 shrink-0 rounded-md border-2 border-ink bg-card font-display text-xl leading-none active:translate-y-0.5"
              aria-label="diminuir"
            >
              −
            </button>
            <label className="shadow-hard-sm flex flex-1 cursor-text items-baseline justify-center gap-1 rounded-md border-2 border-ink bg-card py-2 text-center transition-colors focus-within:bg-paper">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customValor}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                  onCustomValor(digits === "" ? 0 : Math.min(99, Number(digits)));
                  onDuracao("custom");
                }}
                onBlur={() => onCustomValor(Math.max(1, customValor))}
                aria-label="Valor da duração"
                className="w-16 bg-transparent text-center font-serif text-3xl font-bold focus:outline-none"
              />
              <span className="font-display text-sm tracking-wide">
                {customValor <= 1
                  ? UNIDADES.find((u) => u.id === customUnidade)?.label
                  : UNIDADES.find((u) => u.id === customUnidade)?.labelPlural}
              </span>
            </label>
            <button
              type="button"
              onClick={() => { onCustomValor(Math.min(99, customValor + 1)); onDuracao("custom"); }}
              className="h-12 w-12 shrink-0 rounded-md border-2 border-ink bg-card font-display text-xl leading-none active:translate-y-0.5"
              aria-label="aumentar"
            >
              +
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-sm border-2 border-ink">
            {UNIDADES.map((u) => {
              const ativo = customUnidade === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { onCustomUnidade(u.id); onDuracao("custom"); }}
                  className={`px-2 py-2 font-display text-[11px] uppercase tracking-wide ${ativo ? "bg-ink text-paper" : "bg-card text-ink"}`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] italic text-ink-soft">Mín. 1 semana · máx. 1 ano</p>
      </div>
    </>
  );
}

function Passo2({ metrica, onMetrica }: { metrica: Metrica; onMetrica: (v: Metrica) => void }) {
  const selecionada = METRICAS.find((m) => m.id === metrica)!;
  return (
    <>
      <div className="space-y-2">
        <label className="block font-display text-xs uppercase tracking-widest text-ink">Métrica do ranking</label>
        <div className="space-y-2">
          {METRICAS.map((m) => {
            const sel = metrica === m.id;
            return (
              <button key={m.id} type="button" onClick={() => onMetrica(m.id)} className={`flex w-full items-center gap-3 border-2 border-ink px-3 py-3 text-left ${sel ? "translate-x-[2px] translate-y-[2px] bg-moss text-paper shadow-none" : "bg-paper text-ink shadow-hard-sm"}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 ${sel ? "border-paper bg-paper text-ink" : "border-ink bg-paper"}`}>{sel ? "✓" : ""}</span>
                <span className="font-display text-sm uppercase tracking-wider">{m.label}</span>
              </button>
            );
          })}
        </div>
        <p className="pt-1 text-[11px] italic text-ink-soft">No check-in: {selecionada.checkin.toLowerCase()}.</p>
      </div>
      <div className="flex items-start gap-3 border-2 border-ink bg-mustard px-3 py-3 shadow-hard-sm">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-ink bg-paper font-display text-xs">!</span>
        <div>
          <p className="font-display text-[11px] uppercase tracking-widest text-ink">As regras congelam no início</p>
          <p className="mt-0.5 text-[11px] leading-snug text-ink/80">Depois que o desafio começar, nome, duração e métrica ficam travados.</p>
        </div>
      </div>
    </>
  );
}

function Passo3({ codigo, copiado, onCopiar, convidados, onToggleAmigo, participar, onParticipar, amigos }: {
  codigo: string; copiado: boolean; onCopiar: () => void;
  convidados: Set<string>; onToggleAmigo: (id: string) => void;
  participar: boolean; onParticipar: (v: boolean) => void;
  amigos: Amigo[];
}) {
  return (
    <>
      <div className="border-2 border-ink bg-navy p-4 shadow-hard">
        <p className="font-display text-[10px] uppercase tracking-widest text-paper/70">Código do desafio</p>
        <p className="mt-2 font-mono text-4xl font-black tracking-[0.35em] text-mustard">{codigo}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCopiar} className="flex-1 border-2 border-ink bg-paper py-2 font-display text-[11px] uppercase tracking-widest text-ink shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            {copiado ? "Copiado ✓" : "Copiar código"}
          </button>
          <button type="button" onClick={() => navigator.share?.({ text: `Entra no meu desafio de leitura no Quill! Código: ${codigo}` }).catch(() => {})} className="flex-1 border-2 border-ink bg-coral py-2 font-display text-[11px] uppercase tracking-widest text-paper shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            Compartilhar
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label className="font-display text-xs uppercase tracking-widest text-ink">Convidar amigos</label>
          <span className="text-[10px] font-semibold text-ink-soft">{convidados.size} selecionado{convidados.size === 1 ? "" : "s"}</span>
        </div>
        {amigos.length === 0 ? (
          <p className="text-[12px] text-ink-soft">Você ainda não tem amigos no Quill — compartilhe o código acima.</p>
        ) : (
          <ul className="space-y-2">
            {amigos.map((a) => {
              const sel = convidados.has(a.id);
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => onToggleAmigo(a.id)} className={`flex w-full items-center gap-3 border-2 border-ink px-3 py-2 text-left ${sel ? "translate-x-[2px] translate-y-[2px] bg-moss text-paper shadow-none" : "bg-paper text-ink shadow-hard-sm"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display text-sm ${sel ? "bg-paper text-ink" : "bg-cover-2 text-ink"}`}>{a.inicial}</span>
                    <span className="flex-1 font-serif text-base italic">{a.nome}</span>
                    <span className={`flex h-6 w-6 items-center justify-center border-2 ${sel ? "border-paper bg-paper text-ink" : "border-ink bg-paper"}`}>{sel ? "✓" : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-3 border-2 border-ink bg-paper px-3 py-3 shadow-hard-sm">
        <input type="checkbox" checked={participar} onChange={(e) => onParticipar(e.target.checked)} className="h-5 w-5 accent-moss" />
        <span className="flex-1">
          <span className="block font-display text-[11px] uppercase tracking-widest text-ink">Participar do ranking</span>
          <span className="block text-[11px] text-ink-soft">Sua pontuação aparece para os outros membros</span>
        </span>
      </label>
    </>
  );
}
