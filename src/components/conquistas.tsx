"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppImage } from "@/components/app-image";
import { Portal } from "@/components/portal";
import type { AchievementTier } from "@/lib/achievements";
import type { ConquistaView } from "@/lib/conquistas-view";

const NIVEIS: AchievementTier[] = ["bronze", "prata", "ouro"];

const NIVEL_ROTULO: Record<AchievementTier, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
};

// Bronze e ouro são as capas suaves (coral, mostarda); prata é um papel mais
// escuro — não existe cinza na paleta e um cinza puro brigaria com o creme.
const NIVEL_FUNDO: Record<AchievementTier, string> = {
  bronze: "bg-cover-1",
  prata: "bg-[#c9c3b4]",
  ouro: "bg-cover-3",
};

const pct = (c: ConquistaView) => Math.round((c.progresso / c.alvo) * 100);

/**
 * Slot do lápis do admin para a arte de cada conquista. Não é `conquista.*`:
 * aqueles guardam zoom e arte escolhidos para os ícones antigos (redondos,
 * com respiro) e estouravam os ícones novos, que já vêm enquadrados.
 */
const slot = (c: ConquistaView) => `colecao.${c.id}`;

function NivelChip({ nivel }: { nivel: AchievementTier }) {
  return (
    <span
      className={`rounded-full border-[1.5px] border-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${NIVEL_FUNDO[nivel]}`}
    >
      {NIVEL_ROTULO[nivel]}
    </span>
  );
}

function Barra({ valor, fina = false }: { valor: number; fina?: boolean }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-full border-ink bg-paper ${fina ? "h-[7px] border-[1.5px]" : "h-2.5 border-2"}`}
    >
      <div className="h-full bg-moss" style={{ width: `${valor}%` }} />
    </div>
  );
}

/** Mais recentes primeiro; sem data (registro antigo) vai pro fim. */
function recentes(conquistas: ConquistaView[]) {
  return conquistas
    .filter((c) => c.desbloqueada)
    .sort((a, b) => (b.desbloqueadaEmIso ?? "").localeCompare(a.desbloqueadaEmIso ?? ""));
}

/** A que falta menos (em proporção) entre as que já começaram. */
function quaseLa(conquistas: ConquistaView[]) {
  return conquistas
    .filter((c) => !c.desbloqueada && c.progresso > 0)
    .sort((a, b) => b.progresso / b.alvo - a.progresso / a.alvo)[0];
}

/* ---------- Detalhe (folha que sobe de baixo) ---------- */

function ConquistaDetalhe({ conquista: c, onClose }: { conquista: ConquistaView; onClose: () => void }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const quadro = requestAnimationFrame(() => setVisivel(true));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-ink/45 transition-opacity duration-200 ${visivel ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={c.nome}
          onClick={(e) => e.stopPropagation()}
          className={`grid w-full max-w-[390px] justify-items-center gap-3.5 rounded-t-[22px] border-2 border-b-0 border-ink bg-paper px-6 pb-[calc(30px+env(safe-area-inset-bottom))] pt-3 text-center transition-transform duration-300 ease-out motion-reduce:transition-none ${visivel ? "translate-y-0" : "translate-y-full"}`}
        >
          <div className="h-[5px] w-11 rounded-full bg-ink-soft/50" />
          <div className="shadow-hard h-[132px] w-[132px] overflow-hidden rounded-[22px] border-2 border-ink bg-card">
            <AppImage
              slot={slot(c)}
              src={c.icone}
              alt=""
              width={132}
              height={132}
              className={`h-full w-full object-cover ${c.desbloqueada ? "" : "opacity-50 grayscale"}`}
            />
          </div>
          <NivelChip nivel={c.nivel} />
          <h2 className="font-display text-xl uppercase leading-tight">{c.nome}</h2>
          <p className="max-w-[30ch] font-serif text-sm italic">{c.descricao}</p>
          <div className="grid w-full gap-1.5">
            {c.desbloqueada ? (
              <p className="text-xs font-bold text-moss-dark">
                ✓ Desbloqueada{c.desbloqueadaEm ? ` em ${c.desbloqueadaEm}` : ""}
              </p>
            ) : (
              <>
                <div className="flex justify-between text-xs font-bold">
                  <span>Seu progresso</span>
                  <span className="tabular-nums">
                    {c.progresso}/{c.alvo} {c.unidade}
                  </span>
                </div>
                <Barra valor={pct(c)} />
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-card py-3 text-xs font-bold uppercase tracking-wide active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            Fechar
          </button>
        </div>
      </div>
    </Portal>
  );
}

/* ---------- Card da home ---------- */

export function ConquistasCard({ conquistas }: { conquistas: ConquistaView[] }) {
  const [aberta, setAberta] = useState<ConquistaView | null>(null);
  const feitas = recentes(conquistas);
  const mostrar = feitas.slice(0, 4);
  const resto = feitas.length - mostrar.length;
  const proxima = quaseLa(conquistas);

  return (
    <section aria-label="Conquistas" className="shadow-hard overflow-hidden rounded-md border-2 border-ink bg-card">
      <div className="grid gap-3 p-3.5">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-sm uppercase tracking-tight">Conquistas</h2>
          <span className="ml-auto font-display text-[22px] leading-none tabular-nums">
            {feitas.length}
            <small className="font-sans text-xs font-semibold text-ink-soft"> /{conquistas.length}</small>
          </span>
        </div>

        {mostrar.length > 0 ? (
          <div className="flex items-center">
            {mostrar.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setAberta(c)}
                aria-label={c.nome}
                className="-mr-2.5 transition-transform hover:-translate-y-[3px]"
              >
                <AppImage
                  slot={slot(c)}
                  src={c.icone}
                  alt=""
                  width={50}
                  height={50}
                  className="h-[50px] w-[50px] rounded-[11px] border-2 border-ink bg-card object-cover"
                />
              </button>
            ))}
            {resto > 0 && (
              <Link
                href="/conquistas"
                aria-label="Ver todas as conquistas"
                className="grid h-[50px] w-[50px] place-items-center rounded-[11px] border-2 border-ink bg-paper text-[13px] font-bold transition-transform hover:-translate-y-[3px]"
              >
                +{resto}
              </Link>
            )}
          </div>
        ) : (
          <p className="font-serif text-xs italic text-ink-soft">
            Nenhuma ainda. A primeira sessão de leitura já vale uma.
          </p>
        )}

        {proxima && (
          <button
            type="button"
            onClick={() => setAberta(proxima)}
            className="flex w-full items-center gap-2.5 border-t-[1.5px] border-dashed border-[#d9cdb0] pt-3 text-left"
          >
            <AppImage
              slot={slot(proxima)}
              src={proxima.icone}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg border-[1.5px] border-ink object-cover opacity-60 grayscale"
            />
            <span className="grid min-w-0 flex-1 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">Quase lá</span>
              <span className="truncate text-xs font-bold">{proxima.nome}</span>
              <Barra valor={pct(proxima)} fina />
            </span>
            <span className="shrink-0 text-[11px] font-bold tabular-nums text-ink-soft">
              {proxima.progresso}/{proxima.alvo} {proxima.unidade}
            </span>
          </button>
        )}
      </div>
      <Link
        href="/conquistas"
        className="flex w-full items-center justify-between border-t-2 border-ink bg-mustard px-3.5 py-3 text-xs font-bold uppercase tracking-wide active:brightness-95"
      >
        Ver coleção completa
        <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-ink text-sm text-paper">→</span>
      </Link>

      {aberta && <ConquistaDetalhe conquista={aberta} onClose={() => setAberta(null)} />}
    </section>
  );
}

/* ---------- Coleção (/conquistas) ---------- */

type Filtro = "todas" | "feitas" | "faltam";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "feitas", rotulo: "Desbloqueadas" },
  { id: "faltam", rotulo: "Faltam" },
];

export function ColecaoConquistas({ conquistas }: { conquistas: ConquistaView[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [aberta, setAberta] = useState<ConquistaView | null>(null);
  const feitas = conquistas.filter((c) => c.desbloqueada).length;

  const grupos = NIVEIS.map((nivel) => {
    const todos = conquistas.filter((c) => c.nivel === nivel);
    const visiveis = todos.filter(
      (c) => filtro === "todas" || (filtro === "feitas") === c.desbloqueada,
    );
    return { nivel, todos, visiveis };
  }).filter((g) => g.visiveis.length > 0);

  return (
    <div className="px-[18px] pb-8 pt-[18px]">
      <div className="flex items-center gap-2.5">
        <Link
          href="/"
          aria-label="Voltar para a home"
          className="shadow-hard-sm grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-ink bg-card text-lg font-bold active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ←
        </Link>
        <h1 className="font-display text-xl uppercase">Conquistas</h1>
        <span className="ml-auto text-[13px] font-bold tabular-nums">
          {feitas}/{conquistas.length}
        </span>
      </div>

      <div className="mb-1 mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={`rounded-full border-2 border-ink px-[11px] py-[5px] text-[11px] font-bold uppercase ${filtro === f.id ? "bg-ink text-paper" : "bg-card"}`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {grupos.length === 0 && (
        <p className="my-10 text-center font-serif italic text-ink-soft">Nada por aqui.</p>
      )}

      {grupos.map(({ nivel, todos, visiveis }) => (
        <section key={nivel}>
          <div className="mb-2.5 mt-[22px] flex items-center gap-2">
            <NivelChip nivel={nivel} />
            <span className="ml-auto text-[11px] font-bold tabular-nums text-ink-soft">
              {todos.filter((c) => c.desbloqueada).length}/{todos.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-x-2.5 gap-y-3.5">
            {visiveis.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setAberta(c)}
                className="group flex flex-col items-center gap-1.5 self-start text-center"
              >
                <span
                  className={`relative h-[82px] w-[82px] overflow-hidden rounded-[14px] border-2 bg-card transition-all ${
                    c.desbloqueada
                      ? "border-ink shadow-[3px_3px_0_var(--color-ink)] group-active:translate-x-[2px] group-active:translate-y-[2px] group-active:shadow-[1px_1px_0_var(--color-ink)]"
                      : "border-dashed border-ink-soft"
                  }`}
                >
                  <AppImage
                    slot={slot(c)}
                    src={c.icone}
                    alt=""
                    width={82}
                    height={82}
                    className={`h-full w-full object-cover ${c.desbloqueada ? "" : "opacity-45 grayscale"}`}
                  />
                  {c.desbloqueada && (
                    <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full border-[1.5px] border-ink bg-moss text-xs font-bold text-white">
                      ✓
                    </span>
                  )}
                </span>
                {/* Sempre duas linhas de altura: nome curto ou longo, a barra e o
                    progresso caem na mesma linha em todos os cards. */}
                <span className="flex min-h-[2.5em] items-start text-[11px] font-bold leading-[1.25] [text-wrap:balance]">
                  {c.nome}
                </span>
                {!c.desbloqueada &&
                  (c.alvo > 1 ? (
                    <>
                      <span className="w-[70px]">
                        <Barra valor={pct(c)} fina />
                      </span>
                      <span className="text-[9.5px] font-bold tabular-nums text-ink-soft">
                        {c.progresso}/{c.alvo} {c.unidade}
                      </span>
                    </>
                  ) : (
                    <span className="text-[9.5px] font-bold text-ink-soft">ainda não</span>
                  ))}
              </button>
            ))}
          </div>
        </section>
      ))}

      {aberta && <ConquistaDetalhe conquista={aberta} onClose={() => setAberta(null)} />}
    </div>
  );
}
