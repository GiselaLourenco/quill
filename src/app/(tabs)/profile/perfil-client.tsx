"use client";

import Image from "next/image";
import { AppImage } from "@/components/app-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Friend, FriendShelf } from "@/lib/friends";
import { AVATARES, AVATAR_FUNDOS, AVATAR_FUNDO_PADRAO, avatarDeExibicao, avatarPorSrc } from "@/lib/avatares";
import { nomeExibicao } from "@/lib/nome-exibicao";
import { faseDaImagem } from "@/lib/gamification";
import { BookThumb } from "@/components/book-thumb";
import { EmptyState } from "@/components/empty-state";

export type BadgeView = {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  cor: string;
  desbloqueada: boolean;
  progresso: number;
  alvo: number;
};

export type DesafioRanking = {
  id: string;
  nome: string;
  emoji: string;
  competes: boolean;
};

type DialogId = "amigos" | "metas" | "badges" | "pilulas" | "ranking" | "senha" | "excluir" | "foto" | null;

type Props = {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  avatarZoom: number;
  avatarBg: string;
  updateAvatarAction: (input: {
    nome: string;
    username: string;
    avatarId: string;
    zoom: number;
    fundo: string;
  }) => Promise<{ error: string | null }>;
  membroDesde: string | null;
  totalLivros: number;
  totalHoras: number;
  recordeStreak: number;
  amigos: Friend[];
  estantes: FriendShelf[];
  badges: BadgeView[];
  desafios: DesafioRanking[];
  totalFinished: number;
  annualTarget: number;
  phaseLabel: string | null;
  phaseImg: string | null;
  logoutAction: () => Promise<void>;
  deleteAccountAction: () => Promise<{ error: string } | void>;
  toggleCompeteAction: (groupId: string, competes: boolean) => Promise<void>;
};

export function PerfilClient({
  displayName,
  username,
  avatarUrl,
  avatarZoom,
  avatarBg,
  updateAvatarAction,
  membroDesde,
  totalLivros,
  totalHoras,
  recordeStreak,
  amigos,
  estantes,
  badges,
  desafios,
  totalFinished,
  annualTarget,
  phaseLabel,
  phaseImg,
  logoutAction,
  deleteAccountAction,
  toggleCompeteAction,
}: Props) {
  const [aberto, setAberto] = useState<DialogId>(null);
  // `avatarPorSrc` responde "houve escolha?" — é o que o rascunho do editor
  // precisa saber. `avatarDeExibicao` responde "o que desenhar?", e aí o
  // padrão entra pra quem nunca escolheu.
  const avatarAtual = avatarPorSrc(avatarUrl);
  const avatarExibido = avatarDeExibicao(avatarUrl);
  const [rascunhoAvatar, setRascunhoAvatar] = useState<string>(avatarAtual?.id ?? AVATARES[0].id);
  const [rascunhoZoom, setRascunhoZoom] = useState(avatarZoom);
  const [rascunhoFundo, setRascunhoFundo] = useState(avatarBg || AVATAR_FUNDO_PADRAO);
  const [rascunhoNome, setRascunhoNome] = useState(nomeExibicao(displayName, username));
  const [rascunhoUsername, setRascunhoUsername] = useState(username ?? "");

  const nome = nomeExibicao(displayName, username);
  const metaPercent =
    annualTarget > 0 ? Math.min(100, Math.round((totalFinished / annualTarget) * 100)) : 0;

  const desbloqueadas = badges.filter((b) => b.desbloqueada);
  // Sem nenhuma conquista ainda, mostra as três mais próximas de sair.
  const destaques =
    desbloqueadas.length > 0
      ? desbloqueadas.slice(-3)
      : [...badges].sort((a, b) => b.progresso / b.alvo - a.progresso / a.alvo).slice(0, 3);

  return (
    <div className="min-h-full bg-paper px-6 pb-24 pt-8 text-ink">
      {/* Cabeçalho de identidade */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div
            className="shadow-hard flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-coral"
            style={{ backgroundColor: avatarBg || AVATAR_FUNDO_PADRAO }}
          >
            <Image
              src={avatarExibido.src}
              alt={avatarExibido.nome}
              width={96}
              height={96}
              className="h-full w-full object-contain"
              style={{ transform: `scale(${avatarZoom / 100})` }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setRascunhoAvatar(avatarAtual?.id ?? AVATARES[0].id);
              setRascunhoZoom(avatarZoom);
              setRascunhoFundo(avatarBg || AVATAR_FUNDO_PADRAO);
              setRascunhoNome(nomeExibicao(displayName, username));
              setRascunhoUsername(username ?? "");
              setAberto("foto");
            }}
            aria-label="Editar foto do perfil"
            className="shadow-hard-sm absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-card transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink" aria-hidden>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </div>
        <div className="text-center">
          <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-ink">
            {nome}
          </h1>
          <p className="mt-1 font-serif text-sm italic text-ink-soft">
            {username ? `@${username}` : "sem username"}
            {membroDesde ? ` · leitora desde ${membroDesde}` : ""}
          </p>
        </div>
      </div>

      {/* Big numbers */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        <BigNumber valor={String(totalLivros)} label="Livros" cor="text-ink" />
        <BigNumber valor={String(recordeStreak)} label="Recorde streak" cor="text-coral" />
        <BigNumber valor={String(totalHoras)} sufixo="h" label="Tempo total" cor="text-moss" />
      </div>

      <button
        type="button"
        onClick={() => setAberto("amigos")}
        className="shadow-hard mt-3 flex w-full items-center justify-between rounded-md border-2 border-ink bg-card p-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <span className="text-sm font-bold uppercase tracking-wide">Amigos</span>
        <span className="flex items-center gap-2">
          <span className="font-display text-lg">{amigos.length}</span>
          <span className="text-lg">›</span>
        </span>
      </button>

      {/* Meta do ano + fase do Quill */}
      <Link
        href="/metas"
        className="shadow-hard mt-6 flex w-full gap-4 rounded-md border-2 border-ink bg-mustard p-4 text-left transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper">
          <AppImage
            slot={phaseImg ? `perfil.fase.${faseDaImagem(phaseImg)}` : "perfil.meta-ano"}
            src={phaseImg ?? "/img/perfil/quill-ok.webp"}
            alt=""
            aria-hidden
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xs uppercase tracking-tight">
            {annualTarget > 0 ? `Meta do ano: ${annualTarget} livros` : "Meta do ano ainda não definida"}
          </h3>
          {phaseLabel && (
            <p className="mt-0.5 text-sm font-semibold">
              Fase do Quill:{" "}
              <span className="text-moss underline decoration-2 underline-offset-2">{phaseLabel}</span>
            </p>
          )}
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-paper">
            <div className="h-full bg-moss" style={{ width: `${metaPercent}%` }} />
          </div>
          <p className="mt-1 font-serif text-[11px] italic">
            {annualTarget > 0
              ? `${totalFinished} lidos · faltam ${Math.max(0, annualTarget - totalFinished)} livros · gerenciar em Metas`
              : "toque para definir sua meta em Metas"}
          </p>
        </div>
      </Link>

      {/* Badges em destaque */}
      <div className="mt-8 space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-sm uppercase tracking-tight">Badges em destaque</h2>
          <button
            type="button"
            onClick={() => setAberto("badges")}
            className="text-xs font-bold underline underline-offset-2"
          >
            ver todas
          </button>
        </div>
        <div className="shadow-hard-sm flex gap-4 rounded-md border-2 border-ink bg-card p-3">
          {destaques.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setAberto("badges")}
              aria-label={c.titulo}
              className={`shadow-hard-sm flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink ${c.cor} transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none`}
            >
              <AppImage slot={`conquista.${c.id}`} src={c.icone} alt="" aria-hidden width={34} height={34} className="h-[34px] w-[34px] object-contain" />
            </button>
          ))}
          <div className="flex flex-1 items-center justify-end">
            <AppImage
              slot="perfil.badges"
              src="/img/perfil/quill-rindo.webp"
              alt=""
              aria-hidden
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />
          </div>
        </div>
      </div>

      {/* Preferências — só o que existe de fato no banco */}
      <div className="mt-8 space-y-3">
        <h2 className="font-display text-sm uppercase tracking-tight">Preferências</h2>
        <div className="shadow-hard space-y-4 rounded-md border-2 border-ink bg-card p-4">
          <button
            type="button"
            onClick={() => setAberto("pilulas")}
            className="flex w-full items-center justify-between text-left"
          >
            <span>
              <span className="block text-sm font-bold">Pílulas do painel</span>
              <span className="block text-[11px] text-ink-soft">
                escolha quais números aparecem na home
              </span>
            </span>
            <span className="text-lg">›</span>
          </button>
          <div className="border-b border-dashed border-ink/30" />
          <button
            type="button"
            onClick={() => setAberto("ranking")}
            className="flex w-full items-center justify-between text-left"
          >
            <span>
              <span className="block text-sm font-bold">Aparecer nos rankings</span>
              <span className="block text-[11px] text-ink-soft">
                {desafios.length === 0
                  ? "você não participa de nenhum desafio"
                  : `${desafios.filter((d) => d.competes).length} de ${desafios.length} ${desafios.length === 1 ? "desafio" : "desafios"}`}
              </span>
            </span>
            <span className="text-lg">›</span>
          </button>
        </div>
      </div>

      {/* Conta */}
      <div className="mt-8 space-y-3">
        <h2 className="font-display text-sm uppercase tracking-tight">Configurações de conta</h2>
        <div className="shadow-hard overflow-hidden rounded-md border-2 border-ink bg-card">
          <button
            type="button"
            onClick={() => {
              setRascunhoAvatar(avatarAtual?.id ?? AVATARES[0].id);
              setRascunhoZoom(avatarZoom);
              setRascunhoFundo(avatarBg || AVATAR_FUNDO_PADRAO);
              setRascunhoNome(nomeExibicao(displayName, username));
              setRascunhoUsername(username ?? "");
              setAberto("foto");
            }}
            className="flex w-full items-center justify-between p-4 transition-colors active:bg-paper"
          >
            <span className="text-sm font-bold uppercase">Editar perfil</span>
            <span className="text-xl">›</span>
          </button>
          <div className="h-0.5 bg-ink" />
          <button
            type="button"
            onClick={() => setAberto("senha")}
            className="flex w-full items-center justify-between p-4 transition-colors active:bg-paper"
          >
            <span className="text-sm font-bold uppercase">Alterar senha</span>
            <span className="text-xl">›</span>
          </button>
          <div className="h-0.5 bg-ink" />
          <button
            type="button"
            onClick={() => setAberto("excluir")}
            className="flex w-full items-center justify-between p-4 text-coral transition-colors active:bg-coral/10"
          >
            <span className="text-sm font-bold uppercase">Excluir conta</span>
          </button>
        </div>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          className="shadow-hard mt-4 w-full rounded-md border-2 border-ink bg-card py-4 font-display text-sm uppercase tracking-tight transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Sair da conta
        </button>
      </form>

      {/* ---- Dialogs ---- */}
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 px-4 pb-6"
          onClick={() => setAberto(null)}
        >
          <div
            className="shadow-hard max-h-[85vh] w-full max-w-[390px] overflow-y-auto rounded-md border-2 border-ink bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            {aberto === "amigos" && (
              <AmigosDialog amigos={amigos} estantes={estantes} onClose={() => setAberto(null)} />
            )}
            {aberto === "foto" && (
              <EditarPerfilDialog
                nome={rascunhoNome}
                username={rascunhoUsername}
                onUsername={setRascunhoUsername}
                escolhido={rascunhoAvatar}
                zoom={rascunhoZoom}
                fundo={rascunhoFundo}
                onNome={setRascunhoNome}
                onEscolher={setRascunhoAvatar}
                onZoom={setRascunhoZoom}
                onFundo={setRascunhoFundo}
                onSalvar={updateAvatarAction}
                onClose={() => setAberto(null)}
              />
            )}
            {aberto === "pilulas" && <PilulasDialog onClose={() => setAberto(null)} />}
            {aberto === "ranking" && (
              <RankingDialog
                desafios={desafios}
                onToggle={toggleCompeteAction}
                onClose={() => setAberto(null)}
              />
            )}
            {aberto === "badges" && (
              <BadgesDialog badges={badges} onClose={() => setAberto(null)} />
            )}
            {aberto === "senha" && <SenhaDialog onClose={() => setAberto(null)} />}
            {aberto === "excluir" && (
              <ExcluirDialog onExcluir={deleteAccountAction} onClose={() => setAberto(null)} />
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
  sufixo,
  label,
  cor,
}: {
  valor: string;
  sufixo?: string;
  label: string;
  cor: string;
}) {
  return (
    <div className="shadow-hard flex flex-col items-center rounded-md border-2 border-ink bg-card p-3 text-center">
      <span className={`font-display text-2xl leading-none ${cor}`}>
        {valor}
        {sufixo ? <span className="text-sm">{sufixo}</span> : null}
      </span>
      <span className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wider text-ink-soft">
        {label}
      </span>
    </div>
  );
}

function Toggle({
  titulo,
  desc,
  ativo,
  onToggle,
}: {
  titulo: string;
  desc: string;
  ativo: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={ativo}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-sm font-bold">{titulo}</span>
        <span className="block text-[11px] text-ink-soft">{desc}</span>
      </span>
      <span
        className={`flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 border-ink p-0.5 transition-colors ${
          ativo ? "justify-end bg-moss" : "justify-start bg-paper"
        }`}
      >
        <span className="h-4 w-4 rounded-full border-2 border-ink bg-card" />
      </span>
    </button>
  );
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
          aria-label="Fechar"
          className="shadow-hard-sm flex h-8 w-8 items-center justify-center rounded-md border-2 border-ink bg-card font-bold text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

const STATUS_AMIGO: Record<string, string> = {
  want: "quero ler",
  reading: "lendo",
  finished: "terminei",
  abandoned: "abandonei",
  platinum: "platinei",
};

function AmigosDialog({
  amigos,
  estantes,
  onClose,
}: {
  amigos: Friend[];
  estantes: FriendShelf[];
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const filtrados = amigos.filter((a) =>
    a.name.toLowerCase().includes(busca.trim().toLowerCase()),
  );
  const selecionado = amigos.find((a) => a.id === abertoId) ?? null;
  const estante = estantes.find((e) => e.friendId === abertoId) ?? null;

  // ---- Estante de um amigo -------------------------------------------
  if (selecionado) {
    const livros = estante?.items ?? [];
    return (
      <DialogShell title="Perfil do amigo" onClose={onClose}>
        <button
          type="button"
          onClick={() => setAbertoId(null)}
          className="shadow-hard-sm mb-3 rounded-md border-2 border-ink bg-paper px-3 py-1 text-xs font-bold uppercase active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ‹ Amigos
        </button>

        <div className="shadow-hard-sm mb-3 flex items-center gap-3 rounded-md border-2 border-ink bg-paper p-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-navy">
            <span className="font-display text-xl text-paper">
              {selecionado.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg uppercase leading-none">
              {selecionado.name}
            </p>
            <p className="mt-1 font-serif text-xs italic text-ink-soft">
              {livros.length} {livros.length === 1 ? "livro" : "livros"} na estante
            </p>
          </div>
        </div>

        {livros.length === 0 ? (
          <EmptyState
            compacto
            mascote="lendo"
            titulo="Estante vazia"
            texto={`${selecionado.name} ainda não adicionou nenhum livro.`}
          />
        ) : (
          <ul className="space-y-3">
            {livros.map((l) => (
              <li key={l.id} className="rounded-md border-2 border-ink bg-paper p-3">
                <div className="flex items-start gap-3">
                  <BookThumb item={l} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold uppercase leading-tight">{l.title}</p>
                    {l.creator && (
                      <p className="font-serif text-xs italic text-ink-soft">{l.creator}</p>
                    )}
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                      {STATUS_AMIGO[l.status] ?? l.status}
                      {l.progressLabel ? ` · ${l.progressLabel}` : ""}
                      {l.stars ? ` · ${"★".repeat(l.stars)}` : ""}
                    </p>
                  </div>
                </div>
                {/* Só comentários públicos chegam até aqui (getFriendsShelf filtra) */}
                {l.lastComment && (
                  <p className="mt-2 rounded-md border-2 border-ink bg-card p-2 font-serif text-xs italic">
                    {l.lastComment.chapterRef != null && (
                      <span className="not-italic text-ink-soft">
                        cap. {l.lastComment.chapterRef} ·{" "}
                      </span>
                    )}
                    “{l.lastComment.content}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogShell>
    );
  }

  // ---- Lista de amigos -------------------------------------------------
  return (
    <DialogShell title={`Amigos (${amigos.length})`} onClose={onClose}>
      {amigos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AppImage
            slot="perfil.amigos-vazio"
            src="/img/perfil/quill-zen.webp"
            alt="Quill esperando companhia"
            width={140}
            height={140}
            className="w-28"
          />
          <p className="max-w-[240px] font-serif text-sm italic text-ink-soft">
            Você ainda não tem amigos por aqui. Quando alguém te adicionar, a estante
            dessa pessoa aparece na aba Estante.
          </p>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar amigo pelo nome"
            aria-label="Buscar amigo"
            className="shadow-hard-sm mb-3 w-full rounded-md border-2 border-ink bg-paper px-3 py-2 font-serif text-sm"
          />
          {filtrados.length === 0 ? (
            <p className="font-serif text-sm italic text-ink-soft">
              Nenhum amigo encontrado.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-md border-2 border-ink">
              {filtrados.map((a, i) => (
                <li
                  key={a.id}
                  className={i !== filtrados.length - 1 ? "border-b-2 border-ink" : ""}
                >
                  <button
                    type="button"
                    onClick={() => setAbertoId(a.id)}
                    className="flex w-full items-center gap-3 bg-card p-3 text-left transition-colors active:bg-paper"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-navy">
                      <span className="font-display text-sm text-paper">
                        {a.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold uppercase">{a.name}</p>
                      <p className="font-serif text-xs italic text-ink-soft">
                        {estantes.find((e) => e.friendId === a.id)?.items.length ?? 0} livros
                        na estante
                      </p>
                    </div>
                    <span className="text-lg">›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </DialogShell>
  );
}


function EditarPerfilDialog({
  nome,
  username,
  onUsername,
  escolhido,
  zoom,
  fundo,
  onNome,
  onEscolher,
  onZoom,
  onFundo,
  onSalvar,
  onClose,
}: {
  nome: string;
  username: string;
  onUsername: (v: string) => void;
  escolhido: string;
  zoom: number;
  fundo: string;
  onNome: (v: string) => void;
  onEscolher: (id: string) => void;
  onZoom: (z: number) => void;
  onFundo: (c: string) => void;
  onSalvar: (input: {
    nome: string;
    username: string;
    avatarId: string;
    zoom: number;
    fundo: string;
  }) => Promise<{ error: string | null }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSave] = useTransition();
  const arte = AVATARES.find((a) => a.id === escolhido) ?? AVATARES[0];

  return (
    <DialogShell title="Editar perfil" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <label htmlFor="perfil-nome" className="text-[11px] font-bold uppercase tracking-tight text-ink-soft">
          Nome de exibição
        </label>
        <input
          id="perfil-nome"
          type="text"
          value={nome}
          onChange={(e) => onNome(e.target.value)}
          maxLength={30}
          className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-paper px-4 py-3 font-serif text-lg text-ink outline-none placeholder:text-ink-soft/60 focus:bg-white"
        />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <label htmlFor="perfil-username" className="text-[11px] font-bold uppercase tracking-tight text-ink-soft">
          Username
        </label>
        <input
          id="perfil-username"
          type="text"
          value={username}
          onChange={(e) => onUsername(e.target.value)}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby="perfil-username-ajuda"
          className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-paper px-4 py-3 font-mono text-sm text-ink outline-none focus:bg-white"
        />
        <span id="perfil-username-ajuda" className="text-[10px] font-bold uppercase tracking-tight text-ink-soft">
          Letras, números, ponto e underline — precisa ser único
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div
          className="shadow-hard flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-ink"
          style={{ backgroundColor: fundo }}
        >
          <Image
            src={arte.src}
            alt={arte.nome}
            width={112}
            height={112}
            className="h-full w-full object-contain"
            style={{ transform: `scale(${zoom / 100})` }}
          />
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-tight text-ink-soft">
              Redimensionar
            </span>
            <span className="font-display text-xs">{zoom}%</span>
          </div>
          <input
            type="range"
            min={80}
            max={200}
            step={5}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            aria-label="Redimensionar foto do perfil"
            className="mt-2 w-full accent-coral"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {AVATARES.map((op) => {
          const ativo = op.id === escolhido;
          return (
            <button
              key={op.id}
              type="button"
              aria-label={op.nome}
              aria-pressed={ativo}
              onClick={() => onEscolher(op.id)}
              style={{ backgroundColor: fundo }}
              className={`flex aspect-square items-center justify-center overflow-hidden rounded-full border-2 border-ink ${
                ativo ? "shadow-hard" : "opacity-70"
              }`}
            >
              <Image src={op.src} alt="" width={72} height={72} className="h-full w-full object-contain" />
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <span className="text-[11px] font-bold uppercase tracking-tight text-ink-soft">Cor de fundo</span>
        <div className="mt-2 grid grid-cols-8 gap-2">
          {AVATAR_FUNDOS.map((cor) => {
            const ativo = cor === fundo;
            return (
              <button
                key={cor}
                type="button"
                aria-label={`Fundo ${cor}`}
                aria-pressed={ativo}
                onClick={() => onFundo(cor)}
                style={{ backgroundColor: cor }}
                className={`aspect-square rounded-full border-2 border-ink ${
                  ativo ? "shadow-hard-sm ring-2 ring-ink ring-offset-2 ring-offset-card" : "opacity-80"
                }`}
              />
            );
          })}
        </div>
      </div>

      {erro && <p className="mt-3 text-sm font-medium text-coral">{erro}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-paper py-3 font-display text-xs uppercase tracking-tight transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={() =>
            startSave(async () => {
              const r = await onSalvar({ nome, username, avatarId: escolhido, zoom, fundo });
              if (r.error) { setErro(r.error); return; }
              router.refresh();
              onClose();
            })
          }
          className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-moss py-3 font-display text-xs uppercase tracking-tight text-paper transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </DialogShell>
  );
}

function PilulasDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell title="Pílulas do painel" onClose={onClose}>
      <ul className="space-y-2">
        {["Streak", "Minutos hoje", "Páginas por dia", "Páginas por hora"].map((p) => (
          <li
            key={p}
            className="flex items-center justify-between rounded-md border-2 border-ink bg-card px-3 py-2"
          >
            <span className="text-sm font-bold">{p}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
              no painel
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-serif text-xs italic text-ink-soft">
        A escolha de quais pílulas aparecem é feita na tela de personalização.
      </p>
      <Link
        href="/personalizar"
        className="shadow-hard mt-4 block rounded-md border-2 border-ink bg-moss py-3 text-center font-display text-xs uppercase tracking-widest text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        Personalizar painel
      </Link>
    </DialogShell>
  );
}

function RankingDialog({
  desafios,
  onToggle,
  onClose,
}: {
  desafios: DesafioRanking[];
  onToggle: (groupId: string, competes: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [estado, setEstado] = useState(() =>
    Object.fromEntries(desafios.map((d) => [d.id, d.competes])),
  );
  const [salvando, startSave] = useTransition();

  return (
    <DialogShell title="Aparecer nos rankings" onClose={onClose}>
      {desafios.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AppImage
            slot="perfil.rankings-vazio"
            src="/img/perfil/quill-omg.webp"
            alt=""
            aria-hidden
            width={140}
            height={80}
            className="w-28"
          />
          <p className="max-w-[240px] font-serif text-sm italic text-ink-soft">
            O ranking é por desafio. Entre em um desafio e a opção aparece aqui.
          </p>
          <Link
            href="/juntos"
            className="shadow-hard-sm rounded-md border-2 border-ink bg-mustard px-4 py-2.5 font-display text-xs uppercase tracking-wider text-ink"
          >
            Ver desafios
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {desafios.map((d) => (
            <li key={d.id} className="rounded-md border-2 border-ink bg-card p-3">
              <Toggle
                titulo={`${d.emoji} ${d.nome}`}
                desc={estado[d.id] ? "você aparece no placar" : "você fica fora do placar"}
                ativo={Boolean(estado[d.id])}
                onToggle={() => {
                  const proximo = !estado[d.id];
                  setEstado((e) => ({ ...e, [d.id]: proximo }));
                  startSave(async () => {
                    await onToggle(d.id, proximo);
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {salvando && (
        <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-ink-soft">
          salvando…
        </p>
      )}
    </DialogShell>
  );
}

function BadgesDialog({ badges, onClose }: { badges: BadgeView[]; onClose: () => void }) {
  return (
    <DialogShell title="Conquistas" onClose={onClose}>
      <ul className="space-y-3">
        {badges.map((c) => (
          <li
            key={c.id}
            className={`flex items-center gap-3 rounded-md border-2 border-ink p-3 ${
              c.desbloqueada ? "bg-card" : "bg-card opacity-50"
            }`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-md border-2 border-ink ${c.cor}`}
            >
              <AppImage slot={`conquista.${c.id}`} src={c.icone} alt="" aria-hidden width={30} height={30} className="h-[30px] w-[30px] object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold uppercase">{c.titulo}</p>
              <p className="font-serif text-xs italic">{c.descricao}</p>
              {!c.desbloqueada && (
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border-2 border-ink bg-paper">
                  <div
                    className="h-full bg-moss"
                    style={{ width: `${Math.min(100, Math.round((c.progresso / c.alvo) * 100))}%` }}
                  />
                </div>
              )}
            </div>
            <span className="shrink-0 text-[10px] font-bold uppercase text-ink-soft">
              {c.desbloqueada ? "✓" : `${c.progresso}/${c.alvo}`}
            </span>
          </li>
        ))}
      </ul>
    </DialogShell>
  );
}

function SenhaDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell title="Alterar senha" onClose={onClose}>
      <p className="mb-3 font-serif text-sm text-ink-soft">
        Por segurança, a troca de senha é feita pelo link enviado por e-mail.
      </p>
      <Link
        href="/login?recuperar=1"
        className="shadow-hard block rounded-md border-2 border-ink bg-moss py-3 text-center font-display text-xs uppercase tracking-widest text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        Enviar link por e-mail
      </Link>
    </DialogShell>
  );
}

const CONFIRMACAO = "EXCLUIR";

function ExcluirDialog({
  onExcluir,
  onClose,
}: {
  onExcluir: () => Promise<{ error: string } | void>;
  onClose: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, startDelete] = useTransition();
  const confirmado = texto.trim().toUpperCase() === CONFIRMACAO;

  return (
    <DialogShell title="Excluir conta" onClose={onClose}>
      <p className="mb-3 font-serif text-sm">
        Esta ação é permanente. Todos os seus livros, sessões, metas, conquistas, desafios
        e o diário serão apagados. Não dá pra desfazer.
      </p>
      <label htmlFor="confirmar-exclusao" className="block text-sm font-bold">
        Digite <span className="font-mono text-coral">{CONFIRMACAO}</span> para confirmar
      </label>
      <input
        id="confirmar-exclusao"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoComplete="off"
        className="mt-1.5 w-full rounded-md border-2 border-ink bg-card px-3 py-2 font-mono text-sm focus:outline-none"
      />
      {erro && <p className="mt-2 text-sm font-medium text-coral">{erro}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-card py-3 font-display text-xs uppercase tracking-widest active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!confirmado || excluindo}
          onClick={() =>
            startDelete(async () => {
              const r = await onExcluir();
              if (r?.error) setErro(r.error);
            })
          }
          className="shadow-hard flex-1 rounded-md border-2 border-ink bg-coral py-3 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:shadow-none"
        >
          {excluindo ? "Excluindo…" : "Excluir"}
        </button>
      </div>
    </DialogShell>
  );
}
