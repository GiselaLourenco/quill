"use client";

import { useState, useTransition } from "react";
import { createSession, publishSession, saveSessionMemory } from "@/app/actions/sessions";

export type LivroLendo = { id: string; titulo: string };

// Atalhos por unidade. Em horas os passos são inteiros: quem pensa "li duas
// horas" não quer marcar 120.
const PRESETS_MIN = [15, 30, 60];
const PRESETS_H = [1, 2, 3];
const MAX_MINUTOS = 600;

type Unidade = "min" | "h";

// Sheet de check-in do desafio: grava uma sessão de leitura de verdade e
// publica o check-in no grupo. O comentário vira nota do check-in e, quando
// há livro vinculado, também comentário na página do livro.
export function CheckinSheet({
  groupId,
  livros,
  onClose,
  onFeito,
}: {
  groupId: string;
  livros: LivroLendo[];
  onClose: () => void;
  onFeito: () => void;
}) {
  const [livroId, setLivroId] = useState<string>(livros[0]?.id ?? "manual");
  // `minutos` continua sendo a verdade — é o que vira `durationSeconds`. A
  // unidade só muda como o número é mostrado e digitado.
  const [minutos, setMinutos] = useState(30);
  const [unidade, setUnidade] = useState<Unidade>("min");
  const [paginas, setPaginas] = useState("");
  const [capitulos, setCapitulos] = useState("");
  const [comentario, setComentario] = useState("");
  // Sem seletor de visibilidade: check-in de desafio existe pra aparecer no
  // desafio. Quem quer anotar só pra si registra a leitura pela aba Ler, onde
  // a nota nasce privada.
  const publico = true;
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSave] = useTransition();

  const emHoras = unidade === "h";
  // Uma casa decimal: "1,5 h" é uma forma normal de contar leitura; mais que
  // isso vira precisão falsa.
  const valorExibido = emHoras ? Math.round((minutos / 60) * 10) / 10 : minutos;

  function trocarUnidade(u: Unidade) {
    setUnidade(u);
    // Em horas, 30 min viraria "0,5" — número quebrado e nenhum atalho aceso.
    // Cai em 1h, a não ser que o valor já seja hora cheia (120 → 2h), aí não
    // faz sentido descartar o que a pessoa tinha posto.
    if (u === "h" && (minutos < 60 || minutos % 60 !== 0)) setMinutos(60);
  }

  function aoMudarValor(bruto: number) {
    const emMinutos = emHoras ? bruto * 60 : bruto;
    setMinutos(Math.max(0, Math.min(MAX_MINUTOS, Math.round(emMinutos))));
  }

  const semLivro = livroId === "manual";
  const podeSalvar = minutos > 0 && !salvando;

  function salvar() {
    if (!podeSalvar) return;
    setErro(null);

    startSave(async () => {
      // Páginas têm prioridade sobre capítulos na hora de ancorar a posição.
      const qtdPaginas = Number(paginas) || 0;
      const qtdCapitulos = Number(capitulos) || 0;
      const unidade = qtdPaginas > 0 ? "pages" : "chapters";
      const quantidade = qtdPaginas > 0 ? qtdPaginas : qtdCapitulos;

      const resultado = await createSession({
        itemId: semLivro ? null : livroId,
        startedAt: new Date().toISOString(),
        durationSeconds: minutos * 60,
        unit: unidade,
        quantity: quantidade > 0 ? quantidade : null,
        tags: [],
      });

      if (resultado.error || !resultado.sessionId) {
        setErro(resultado.error ?? "Não foi possível registrar o check-in.");
        return;
      }

      await publishSession({
        sessionId: resultado.sessionId,
        itemId: semLivro ? null : livroId,
        groupIds: [groupId],
        note: publico && comentario.trim() ? comentario.trim() : null,
        pagesExtra: null,
      });

      if (!semLivro && comentario.trim()) {
        await saveSessionMemory({
          itemId: livroId,
          text: comentario,
          isPublic: publico,
        });
      }

      setSalvo(true);
      setTimeout(() => {
        onFeito();
        onClose();
      }, 1200);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50">
      <div className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto border-t-2 border-ink bg-paper pb-8">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-3">
          <h2 className="font-display text-lg uppercase tracking-tight text-ink">Check-in de hoje</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shadow-hard-sm flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {salvo ? (
          <div className="px-6 py-16 text-center">
            <div className="shadow-hard mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-moss text-paper">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-4 font-display text-xl uppercase text-ink">Check-in feito!</p>
            <p className="mt-1 font-serif text-sm italic text-ink-soft">
              O pessoal do desafio já está vendo.
            </p>
          </div>
        ) : (
          <div className="space-y-5 px-4 pt-5">
            {/* Livro */}
            <div>
              <label
                htmlFor="checkin-livro"
                className="mb-2 block font-display text-[10px] uppercase tracking-widest text-ink"
              >
                Livro
              </label>
              <select
                id="checkin-livro"
                value={livroId}
                onChange={(e) => setLivroId(e.target.value)}
                className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-card px-3 py-3 font-serif text-sm italic text-ink"
              >
                {livros.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.titulo}
                  </option>
                ))}
                <option value="manual">Sem livro vinculado</option>
              </select>
              {semLivro && livros.length === 0 && (
                <p className="mt-2 font-serif text-xs italic text-ink-soft">
                  Você não tem nenhum livro marcado como “lendo” — o check-in vale pelo tempo.
                </p>
              )}
            </div>

            {/* Tempo lido */}
            <div>
              <label
                htmlFor="checkin-minutos"
                className="mb-2 block font-display text-[10px] uppercase tracking-widest text-ink"
              >
                Tempo lido
              </label>
              {/* Número e unidade em cima, atalhos embaixo: com o seletor de
                  unidade na mesma linha, os três presets não cabiam num
                  celular de 390px. */}
              <div className="shadow-hard-sm rounded-md border-2 border-ink bg-card p-3">
                <div className="flex items-center gap-3">
                  <input
                    id="checkin-minutos"
                    type="number"
                    min={0}
                    max={emHoras ? MAX_MINUTOS / 60 : MAX_MINUTOS}
                    step={emHoras ? 0.5 : 1}
                    value={valorExibido}
                    onChange={(e) => aoMudarValor(Number(e.target.value) || 0)}
                    className="w-24 border-b-2 border-ink bg-transparent text-center font-display text-3xl text-ink outline-none"
                  />
                  <div
                    className="flex overflow-hidden rounded-md border-2 border-ink"
                    role="group"
                    aria-label="Unidade do tempo lido"
                  >
                    {(["min", "h"] as Unidade[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => trocarUnidade(u)}
                        aria-pressed={unidade === u}
                        className={`px-3 py-1.5 font-display text-[10px] uppercase tracking-widest ${
                          unidade === u ? "bg-ink text-paper" : "bg-paper text-ink-soft"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {(emHoras ? PRESETS_H : PRESETS_MIN).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => aoMudarValor(p)}
                      className={`flex-1 border-2 border-ink px-2 py-1.5 font-display text-[10px] uppercase tracking-widest ${
                        valorExibido === p ? "bg-mustard text-ink" : "bg-paper text-ink"
                      }`}
                    >
                      {p} {unidade}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Páginas e capítulos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="checkin-paginas"
                  className="mb-2 block font-display text-[10px] uppercase tracking-widest text-ink"
                >
                  Páginas
                </label>
                <input
                  id="checkin-paginas"
                  type="number"
                  min={0}
                  value={paginas}
                  onChange={(e) => setPaginas(e.target.value)}
                  placeholder="0"
                  className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-card px-3 py-3 font-display text-lg text-ink"
                />
              </div>
              <div>
                <label
                  htmlFor="checkin-capitulos"
                  className="mb-2 block font-display text-[10px] uppercase tracking-widest text-ink"
                >
                  Capítulos
                </label>
                <input
                  id="checkin-capitulos"
                  type="number"
                  min={0}
                  value={capitulos}
                  onChange={(e) => setCapitulos(e.target.value)}
                  placeholder="0"
                  className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-card px-3 py-3 font-display text-lg text-ink"
                />
              </div>
            </div>

            {/* Comentário */}
            <div>
              <label
                htmlFor="checkin-comentario"
                className="mb-2 block font-display text-[10px] uppercase tracking-widest text-ink"
              >
                Comentário
              </label>
              <textarea
                id="checkin-comentario"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="O que rolou nessa leitura?"
                className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-card px-3 py-3 font-serif text-sm italic text-ink placeholder:text-ink-soft"
              />
            </div>

            {erro && <p className="text-sm font-medium text-coral">{erro}</p>}

            <button
              type="button"
              onClick={salvar}
              disabled={!podeSalvar}
              className={`shadow-hard w-full border-2 border-ink py-4 font-display text-sm uppercase tracking-widest active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                podeSalvar ? "bg-coral text-paper" : "bg-paper text-ink-soft opacity-60"
              }`}
            >
              {salvando ? "Registrando…" : "Registrar check-in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
