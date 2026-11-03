"use client";

import { useState, useTransition } from "react";
import {
  atualizarCampoLivro,
  atualizarCapaLivro,
  atualizarDatasLeitura,
  type CampoLivro,
} from "@/app/actions/media-items";
import { BuscaLivro } from "@/components/busca-livro";
import { todayLocalDateKey } from "@/lib/date-br";

export type LivroDetalhesProps = {
  itemId: string;
  status: string;
  title: string;
  creator: string | null;
  genre: string | null;
  totalUnits: number | null;
  totalChapters: number | null;
  spotifyUrl: string | null;
  coverKind: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type Editando = CampoLivro | "capa" | "datas" | null;

/** YYYY-MM-DD → dd/mm/aaaa (sem passar por Date: a chave já é o dia certo). */
export function dataBR(chave: string): string {
  return `${chave.slice(8, 10)}/${chave.slice(5, 7)}/${chave.slice(0, 4)}`;
}

function IconeLapis() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </svg>
  );
}

const BOTAO_SECUNDARIO =
  "min-h-10 border-2 border-ink bg-paper px-3.5 font-display text-[10px] uppercase tracking-widest text-ink disabled:opacity-60";
const BOTAO_PRIMARIO =
  "min-h-10 border-2 border-ink bg-moss-dark px-3.5 font-display text-[10px] uppercase tracking-widest text-paper shadow-hard-sm disabled:opacity-60";
const INPUT =
  "min-h-11 w-full rounded border-2 border-ink bg-white px-2.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss-dark";

// Aba "Detalhes" do meu livro: datas de leitura + ficha. Cada linha edita só
// o próprio dado, no lugar — substitui a antiga tela /books/[id]/editar.
export function LivroDetalhes(p: LivroDetalhesProps) {
  const [editando, setEditando] = useState<Editando>(null);
  const [rascunho, setRascunho] = useState("");
  const [rInicio, setRInicio] = useState("");
  const [rFim, setRFim] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSalvar] = useTransition();
  const hoje = todayLocalDateKey();

  function abrir(qual: Editando, valorInicial = "") {
    setEditando(qual);
    setRascunho(valorInicial);
    setErro(null);
  }

  function abrirDatas() {
    abrir("datas");
    setRInicio(p.startedAt ?? "");
    setRFim(p.finishedAt ?? "");
  }

  function fechar() {
    setEditando(null);
    setErro(null);
  }

  function salvar(acao: () => Promise<{ error: string | null }>) {
    startSalvar(async () => {
      const { error } = await acao();
      if (error) setErro(error);
      else fechar();
    });
  }

  // Data de leitura só faz sentido pra quem começou: quero ler/recomendado
  // não têm. Término só existe em livro terminado.
  const temDatas = ["reading", "finished", "abandoned"].includes(p.status);
  const terminado = p.status === "finished";

  const ficha: { campo: CampoLivro; label: string; valor: string; tipo?: "number" | "url"; placeholder?: string }[] = [
    { campo: "titulo", label: "Título", valor: p.title },
    { campo: "autor", label: "Autor", valor: p.creator ?? "" },
    { campo: "genero", label: "Gênero", valor: p.genre ?? "", placeholder: "Ex.: fantasia" },
    { campo: "paginas", label: "Páginas", valor: p.totalUnits ? String(p.totalUnits) : "", tipo: "number", placeholder: "0" },
    { campo: "capitulos", label: "Capítulos", valor: p.totalChapters ? String(p.totalChapters) : "", tipo: "number", placeholder: "0" },
    { campo: "spotify", label: "Playlist", valor: p.spotifyUrl ?? "", tipo: "url", placeholder: "Link da playlist do Spotify" },
  ];

  const mensagemErro = erro && <p className="text-xs font-medium text-coral">{erro}</p>;

  return (
    <div className="space-y-5">
      {temDatas && (
        <section className="border-2 border-ink bg-white shadow-hard-sm">
          <div className="flex items-center justify-between border-b-2 border-ink px-3 py-2">
            <h3 className="font-display text-[10px] uppercase tracking-widest text-ink">Leitura</h3>
            {editando !== "datas" && (
              <button
                type="button"
                onClick={abrirDatas}
                className="flex min-h-8 items-center gap-1.5 text-[13px] font-semibold text-moss-dark"
              >
                <IconeLapis /> Editar datas
              </button>
            )}
          </div>

          {editando === "datas" ? (
            <div className="space-y-2.5 p-3">
              <div className={`grid gap-2.5 ${terminado ? "grid-cols-2" : "grid-cols-1"}`}>
                <label className="flex min-w-0 flex-col gap-1 text-[13px] font-medium">
                  Comecei em
                  <input
                    type="date"
                    value={rInicio}
                    max={(terminado && rFim) || hoje}
                    onChange={(e) => setRInicio(e.target.value)}
                    className={INPUT}
                  />
                </label>
                {terminado && (
                  <label className="flex min-w-0 flex-col gap-1 text-[13px] font-medium">
                    Terminei em
                    <input
                      type="date"
                      value={rFim}
                      min={rInicio || undefined}
                      max={hoje}
                      onChange={(e) => setRFim(e.target.value)}
                      className={INPUT}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-ink/60">
                {!terminado
                  ? "Opcional. Conta nos dias lidos e nas conquistas."
                  : rFim
                    ? `Conta pra meta e retrospectiva de ${rFim.slice(0, 4)}.`
                    : "Opcionais. Sem término, o livro fica fora da meta."}
              </p>
              {mensagemErro}
              <div className="flex gap-2">
                <button type="button" onClick={fechar} disabled={salvando} className={`flex-1 ${BOTAO_SECUNDARIO}`}>
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => salvar(() => atualizarDatasLeitura(p.itemId, rInicio, rFim))}
                  className={`flex-1 ${BOTAO_PRIMARIO}`}
                >
                  {salvando ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <dl className={`grid ${terminado ? "grid-cols-2" : "grid-cols-1"}`}>
                <div className={`p-3 ${terminado ? "border-r-2 border-ink" : ""}`}>
                  <dt className="text-xs text-ink-soft">Comecei em</dt>
                  <dd className="mt-1">
                    <DataOuAdicionar chave={p.startedAt} onAdicionar={abrirDatas} />
                  </dd>
                </div>
                {terminado && (
                  <div className="p-3">
                    <dt className="text-xs text-ink-soft">Terminei em</dt>
                    <dd className="mt-1">
                      <DataOuAdicionar chave={p.finishedAt} onAdicionar={abrirDatas} />
                    </dd>
                  </div>
                )}
              </dl>
              {terminado && !p.finishedAt && (
                <p className="border-t-2 border-dashed border-ink bg-mustard/15 px-3 py-2.5 text-xs text-ink">
                  Sem data de término, esse livro não entra na meta nem na retrospectiva.
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section className="border-2 border-ink bg-white shadow-hard-sm">
        <h3 className="border-b-2 border-ink px-3 py-2 font-display text-[10px] uppercase tracking-widest text-ink">
          Ficha do livro
        </h3>
        <ul>
          {ficha.map((f) => (
            <li key={f.campo} className="border-b border-ink/15">
              {editando === f.campo ? (
                <form
                  className="space-y-2 bg-mustard/10 px-3 py-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    salvar(() => atualizarCampoLivro(p.itemId, f.campo, rascunho));
                  }}
                >
                  <label className="flex flex-col gap-1 text-xs text-ink-soft">
                    {f.label}
                    <input
                      autoFocus
                      type={f.tipo === "number" ? "number" : f.tipo === "url" ? "url" : "text"}
                      inputMode={f.tipo === "number" ? "numeric" : undefined}
                      min={f.tipo === "number" ? 0 : undefined}
                      value={rascunho}
                      placeholder={f.placeholder}
                      onChange={(e) => setRascunho(e.target.value)}
                      className={INPUT}
                    />
                  </label>
                  {mensagemErro}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={fechar} disabled={salvando} className={BOTAO_SECUNDARIO}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={salvando} className={BOTAO_PRIMARIO}>
                      {salvando ? "Salvando…" : "Salvar"}
                    </button>
                  </div>
                </form>
              ) : (
                <LinhaFicha
                  label={f.label}
                  valor={f.campo === "spotify" && f.valor ? "Playlist adicionada" : f.valor}
                  onClick={() => abrir(f.campo, f.valor)}
                />
              )}
            </li>
          ))}
          <li>
            {editando === "capa" ? (
              <div className="space-y-2 bg-mustard/10 px-3 py-2.5">
                <label className="flex flex-col gap-1 text-xs text-ink-soft">
                  Buscar capa
                  <input
                    autoFocus
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    placeholder="Título do livro"
                    className={INPUT}
                  />
                </label>
                <BuscaLivro
                  termo={rascunho}
                  onEscolher={(livro) => {
                    if (!livro.capaGrande) {
                      setErro("Esse resultado não tem capa — tente outro.");
                      return;
                    }
                    salvar(() => atualizarCapaLivro(p.itemId, livro.capaGrande));
                  }}
                  onDispensar={fechar}
                />
                {mensagemErro}
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={fechar} disabled={salvando} className={BOTAO_SECUNDARIO}>
                    Cancelar
                  </button>
                  {p.coverKind === "real" && (
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => salvar(() => atualizarCapaLivro(p.itemId, null))}
                      className={BOTAO_SECUNDARIO}
                    >
                      Usar ilustração Quill
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <LinhaFicha
                label="Capa"
                valor={p.coverKind === "real" ? "Capa real" : "Ilustração Quill"}
                onClick={() => abrir("capa", p.title)}
              />
            )}
          </li>
        </ul>
      </section>
    </div>
  );
}

function LinhaFicha({ label, valor, onClick }: { label: string; valor: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Editar ${label.toLowerCase()}`}
      className="flex min-h-13 w-full items-center gap-3 px-3 py-2 text-left text-ink"
    >
      <span className="w-[5.5rem] flex-none text-xs text-ink-soft">{label}</span>
      <span
        className={`min-w-0 flex-1 truncate text-sm ${valor ? "text-ink" : "font-semibold text-moss-dark"}`}
      >
        {valor || "adicionar"}
      </span>
      <span className="text-ink-soft">
        <IconeLapis />
      </span>
    </button>
  );
}

function DataOuAdicionar({ chave, onAdicionar }: { chave: string | null; onAdicionar: () => void }) {
  if (chave) return <span className="font-display text-base text-ink">{dataBR(chave)}</span>;
  return (
    <button type="button" onClick={onAdicionar} className="min-h-8 text-sm font-semibold text-moss-dark">
      + adicionar
    </button>
  );
}
