"use client";

import { useState } from "react";

type Conquista = {
  id: string;
  titulo: string;
  descricao: string;
  icone: "circulo" | "losango" | "quadrado";
  cor: string;
  desbloqueada: boolean;
};

const CONQUISTAS: Conquista[] = [
  { id: "c1", titulo: "Primeiro livro", descricao: "Terminou o primeiro livro no Quill", icone: "circulo", cor: "bg-coral", desbloqueada: true },
  { id: "c2", titulo: "Maratonista", descricao: "Leu 5 livros em um mês", icone: "losango", cor: "bg-mustard", desbloqueada: true },
  { id: "c3", titulo: "Coletor", descricao: "Estante com 20+ livros", icone: "quadrado", cor: "bg-moss", desbloqueada: true },
  { id: "c4", titulo: "Sociável", descricao: "Adicionou 10 amigos", icone: "circulo", cor: "bg-navy", desbloqueada: false },
  { id: "c5", titulo: "Crítico", descricao: "Escreveu 25 comentários públicos", icone: "quadrado", cor: "bg-coral", desbloqueada: false },
  { id: "c6", titulo: "Fogo constante", descricao: "30 dias seguidos lendo", icone: "losango", cor: "bg-mustard", desbloqueada: false },
];

type DialogId = "metas" | "badges" | "conta" | "senha" | "excluir" | null;

type Props = {
  displayName: string | null;
  username: string | null;
  totalLivros: number;
  totalHoras: number;
  totalAmigos: number;
  totalFinished: number;
  annualTarget: number;
  phaseLabel: string | null;
  phaseEmoji: string | null;
  updateProfileAction: (formData: FormData) => Promise<void>;
  formError: string | null;
  formSaved: boolean;
};

export function PerfilClient({
  displayName,
  username,
  totalLivros,
  totalHoras,
  totalAmigos,
  totalFinished,
  annualTarget,
  phaseLabel,
  phaseEmoji,
  updateProfileAction,
  formError,
  formSaved,
}: Props) {
  const [aberto, setAberto] = useState<DialogId>(null);

  const metaPercent =
    annualTarget > 0
      ? Math.min(100, Math.round((totalFinished / annualTarget) * 100))
      : 0;

  return (
    <div className="min-h-full bg-paper text-ink px-6 pb-24 pt-8">
      {/* Avatar + nome */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-ink bg-moss shadow-hard">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path
              d="M20.24 12.24C21.36 11.12 22 9.63 22 8C22 4.69 19.31 2 16 2C14.37 2 12.88 2.64 11.76 3.76L3.24 12.28C2.46 13.06 2 14.11 2 15.22V20C2 21.1 2.9 22 4 22H8.78C9.89 22 10.94 21.54 11.72 20.76L20.24 12.24Z"
              fill="#f5ecd7"
              stroke="#2c2c2a"
              strokeWidth="2"
            />
            <path d="M7 17L17 7" stroke="#2c2c2a" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="font-display text-2xl uppercase tracking-tight">
            {displayName ?? "Leitor Curioso"}
          </h1>
          {username && (
            <p className="font-serif text-sm italic text-ink-soft">@{username}</p>
          )}
        </div>
      </div>

      {/* Big numbers */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        <BigNumber valor={totalLivros} label="Livros" />
        <BigNumber valor={totalHoras} label="Horas" />
        <BigNumber valor={totalAmigos} label="Amigos" />
      </div>

      {/* Meta anual */}
      <button
        type="button"
        onClick={() => setAberto("metas")}
        className="relative mt-8 w-full overflow-hidden border-2 border-ink bg-mustard p-5 text-left shadow-hard transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <div className="relative z-10">
          <h3 className="font-display text-lg uppercase">Minhas metas</h3>
          <p className="mb-4 font-serif text-sm">
            {annualTarget > 0
              ? `${metaPercent}% da meta anual concluída`
              : "Defina sua meta do ano"}
          </p>
          <div className="h-4 w-full border-2 border-ink bg-paper">
            <div
              className="h-full bg-coral"
              style={{ width: `${metaPercent}%` }}
            />
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full border-2 border-ink opacity-20" />
      </button>

      {/* Conquistas */}
      <div className="mt-8 space-y-3">
        <div className="flex items-end justify-between">
          <h3 className="font-display text-lg uppercase">Conquistas</h3>
          <button
            type="button"
            onClick={() => setAberto("badges")}
            className="text-xs font-bold uppercase tracking-wider text-ink/60 underline underline-offset-2"
          >
            Ver todas
          </button>
        </div>
        <div className="flex gap-4">
          {CONQUISTAS.filter((c) => c.desbloqueada)
            .slice(0, 3)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setAberto("badges")}
                className="flex aspect-square flex-1 items-center justify-center border-2 border-ink bg-navy shadow-hard transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <BadgeIcon icone={c.icone} cor={c.cor} />
              </button>
            ))}
          <button
            type="button"
            onClick={() => setAberto("badges")}
            className="flex aspect-square flex-1 items-center justify-center border-2 border-dashed border-ink bg-transparent"
          >
            <span className="text-xl font-bold opacity-30">+</span>
          </button>
        </div>
      </div>

      {/* Perfil / conta */}
      <div className="mt-8 space-y-3 pt-4">
        <h3 className="font-display text-xs uppercase tracking-widest text-ink-soft">
          Configurações de conta
        </h3>
        <div className="overflow-hidden border-2 border-ink bg-paper shadow-hard">
          <button
            type="button"
            onClick={() => setAberto("conta")}
            className="flex w-full items-center justify-between p-4 active:bg-mustard/20"
          >
            <span className="text-sm font-bold uppercase">Editar perfil</span>
            <span className="text-xl">→</span>
          </button>
          <div className="h-0.5 bg-ink" />
          <button
            type="button"
            onClick={() => setAberto("senha")}
            className="flex w-full items-center justify-between p-4 active:bg-mustard/20"
          >
            <span className="text-sm font-bold uppercase">Alterar senha</span>
            <span className="text-xl">→</span>
          </button>
          <div className="h-0.5 bg-ink" />
          <button
            type="button"
            onClick={() => setAberto("excluir")}
            className="flex w-full items-center justify-between p-4 text-coral active:bg-coral/10"
          >
            <span className="text-sm font-bold uppercase">Excluir conta</span>
          </button>
        </div>
      </div>

      {/* ---- Dialogs ---- */}
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 px-4 pb-6"
          onClick={() => setAberto(null)}
        >
          <div
            className="w-full max-w-[390px] border-2 border-ink bg-paper shadow-hard"
            onClick={(e) => e.stopPropagation()}
          >
            {aberto === "metas" && (
              <MetasDialog
                totalFinished={totalFinished}
                annualTarget={annualTarget}
                phaseEmoji={phaseEmoji}
                phaseLabel={phaseLabel}
                onClose={() => setAberto(null)}
              />
            )}
            {aberto === "badges" && (
              <BadgesDialog onClose={() => setAberto(null)} />
            )}
            {aberto === "conta" && (
              <ContaDialog
                displayName={displayName}
                username={username}
                updateProfileAction={updateProfileAction}
                formError={formError}
                formSaved={formSaved}
                onClose={() => setAberto(null)}
              />
            )}
            {aberto === "senha" && (
              <SenhaDialog onClose={() => setAberto(null)} />
            )}
            {aberto === "excluir" && (
              <ExcluirDialog onClose={() => setAberto(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function BigNumber({
  valor,
  label,
  onClick,
}: {
  valor: number;
  label: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="border-2 border-ink bg-paper p-3 text-center shadow-hard transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
    >
      <div className="font-display text-xl">{valor}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider">{label}</div>
    </Comp>
  );
}

function BadgeIcon({
  icone,
  cor,
}: {
  icone: "circulo" | "losango" | "quadrado";
  cor: string;
}) {
  if (icone === "circulo")
    return <div className={`h-8 w-8 rounded-full border-2 border-ink ${cor}`} />;
  if (icone === "losango")
    return <div className={`h-8 w-8 rotate-45 border-2 border-ink ${cor}`} />;
  return <div className={`h-8 w-8 border-2 border-ink ${cor}`} />;
}

function DialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg uppercase">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper font-bold text-ink shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

function MetasDialog({
  totalFinished,
  annualTarget,
  phaseEmoji,
  phaseLabel,
  onClose,
}: {
  totalFinished: number;
  annualTarget: number;
  phaseEmoji: string | null;
  phaseLabel: string | null;
  onClose: () => void;
}) {
  return (
    <DialogShell title="Minhas metas" onClose={onClose}>
      <div className="space-y-4">
        <div className="border-2 border-ink bg-paper p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold uppercase">Livros no ano</span>
            <span className="font-serif text-xs italic">
              {totalFinished} / {annualTarget > 0 ? annualTarget : "—"} livros
            </span>
          </div>
          <div className="h-4 border-2 border-ink bg-paper">
            <div
              className="h-full bg-moss"
              style={{
                width: annualTarget > 0
                  ? `${Math.min(100, Math.round((totalFinished / annualTarget) * 100))}%`
                  : "0%",
              }}
            />
          </div>
        </div>

        {phaseLabel && (
          <div className="flex items-center gap-3 border-2 border-ink bg-mustard px-3 py-3">
            <span className="text-2xl">{phaseEmoji}</span>
            <div>
              <p className="font-display text-[11px] uppercase tracking-widest text-ink">
                Fase do Quill
              </p>
              <p className="text-sm font-bold capitalize text-ink">{phaseLabel}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full border-2 border-ink bg-moss py-3 font-display text-xs uppercase tracking-widest text-paper shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Fechar
        </button>
      </div>
    </DialogShell>
  );
}

function BadgesDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell title="Conquistas" onClose={onClose}>
      <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
        {CONQUISTAS.map((c) => (
          <li
            key={c.id}
            className={`flex items-center gap-3 border-2 border-ink p-3 ${
              c.desbloqueada ? "bg-paper" : "bg-paper opacity-50"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-navy">
              <BadgeIcon icone={c.icone} cor={c.cor} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold uppercase">{c.titulo}</p>
              <p className="font-serif text-xs italic">{c.descricao}</p>
            </div>
            {!c.desbloqueada && (
              <span className="border border-ink px-2 py-0.5 text-[10px] font-bold uppercase">
                Bloqueada
              </span>
            )}
          </li>
        ))}
      </ul>
    </DialogShell>
  );
}

function ContaDialog({
  displayName,
  username,
  updateProfileAction,
  formError,
  formSaved,
  onClose,
}: {
  displayName: string | null;
  username: string | null;
  updateProfileAction: (formData: FormData) => Promise<void>;
  formError: string | null;
  formSaved: boolean;
  onClose: () => void;
}) {
  return (
    <DialogShell title="Editar perfil" onClose={onClose}>
      <form action={updateProfileAction} className="space-y-3">
        <label className="flex flex-col gap-1">
          <span className="font-display text-[10px] uppercase tracking-widest text-ink-soft">
            Nome de exibição
          </span>
          <input
            name="display_name"
            defaultValue={displayName ?? ""}
            className="border-2 border-ink bg-paper px-3 py-2 font-serif focus:outline-none focus:shadow-hard"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-display text-[10px] uppercase tracking-widest text-ink-soft">
            Username
          </span>
          <input
            name="username"
            defaultValue={username ?? ""}
            className="border-2 border-ink bg-paper px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-hard"
          />
        </label>
        {formError && (
          <p className="text-sm font-medium text-coral">{formError}</p>
        )}
        {formSaved && (
          <p className="text-sm font-medium text-moss-dark">Perfil salvo.</p>
        )}
        <button
          type="submit"
          className="w-full border-2 border-ink bg-moss py-3 font-display text-xs uppercase tracking-widest text-paper shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Salvar
        </button>
      </form>
    </DialogShell>
  );
}

function SenhaDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell title="Alterar senha" onClose={onClose}>
      <div className="space-y-3">
        <input
          type="password"
          placeholder="Senha atual"
          className="w-full border-2 border-ink bg-paper px-3 py-2 font-serif focus:outline-none"
        />
        <input
          type="password"
          placeholder="Nova senha"
          className="w-full border-2 border-ink bg-paper px-3 py-2 font-serif focus:outline-none"
        />
        <input
          type="password"
          placeholder="Confirmar nova senha"
          className="w-full border-2 border-ink bg-paper px-3 py-2 font-serif focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="w-full border-2 border-ink bg-moss py-3 font-display text-xs uppercase tracking-widest text-paper shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Salvar
        </button>
      </div>
    </DialogShell>
  );
}

function ExcluirDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell title="Excluir conta" onClose={onClose}>
      <p className="mb-4 font-serif text-sm">
        Esta ação é permanente. Todos os seus livros, metas, conquistas e diário
        serão apagados.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border-2 border-ink bg-paper py-3 font-display text-xs uppercase tracking-widest shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border-2 border-ink bg-coral py-3 font-display text-xs uppercase tracking-widest text-paper shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Excluir
        </button>
      </div>
    </DialogShell>
  );
}
