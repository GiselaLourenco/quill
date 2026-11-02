"use client";

import Image from "next/image";
import { ImportarAmazon } from "@/components/importar-amazon";
import { useImagens } from "@/components/imagens-provider";
import { BotaoAddLivroAmigo } from "@/components/botao-add-livro-amigo";
import { CampoSenha } from "@/components/campo-senha";
import { trocarSenha } from "@/app/actions/auth";
import { AdicionarAmigo, Avatar } from "@/components/adicionar-amigo";
import { aceitarPedido, recusarPedido } from "@/app/actions/friends";
import type { PedidoRecebido } from "@/lib/friends";
import { AppImage } from "@/components/app-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import type { Friend, FriendShelf } from "@/lib/friends";
import {
  AVATARES,
  AVATAR_FUNDOS,
  AVATAR_FUNDO_PADRAO,
  avatarDeExibicao,
  avatarDeFoto,
  avatarPorSrc,
  type AvatarOpcao,
  type AvatarDeConquista,
  ehFotoEnviada,
} from "@/lib/avatares";
import { enviarAvatar, removerAvatar } from "@/app/actions/admin";
import { nomeExibicao } from "@/lib/nome-exibicao";
import { faseDaImagem } from "@/lib/gamification";
import { BookThumb } from "@/components/book-thumb";
import { EstanteShelf, type DbStatus, type ShelfBook } from "@/components/estante-shelf";
import { EmptyState } from "@/components/empty-state";
import { Portal } from "@/components/portal";

export type DesafioRanking = {
  id: string;
  nome: string;
  competes: boolean;
};

type DialogId = "amigos" | "metas" | "pilulas" | "ranking" | "senha" | "excluir" | "foto" | "importar" | null;

type Props = {
  /** Rótulos das pílulas que a pessoa escolheu, na ordem em que aparecem. */
  pilulas: string[];
  /** Quem pediu pra te adicionar e ainda espera resposta. */
  pedidos: PedidoRecebido[];
  /** Quantas notificações pendentes — o número do card. */
  notificacoes: number;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  avatarZoom: number;
  avatarBg: string;
  /** Fotos que o admin adicionou às opções de avatar — valem pra todo mundo. */
  avataresExtras: string[];
  avataresConquista: AvatarDeConquista[];
  updateAvatarAction: (input: {
    nome: string;
    username: string;
    avatarSrc: string;
    zoom: number;
    fundo: string;
  }) => Promise<{ error: string | null }>;
  membroDesde: string | null;
  totalLivros: number;
  totalHoras: number;
  recordeStreak: number;
  amigos: Friend[];
  estantes: FriendShelf[];
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
  pilulas,
  pedidos,
  notificacoes,
  displayName,
  username,
  avatarUrl,
  avatarZoom,
  avatarBg,
  avataresExtras,
  avataresConquista,
  updateAvatarAction,
  membroDesde,
  totalLivros,
  totalHoras,
  recordeStreak,
  amigos,
  estantes,
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
  const { admin } = useImagens();
  // `avatarPorSrc` responde "houve escolha?" — é o que o rascunho do editor
  // precisa saber. `avatarDeExibicao` responde "o que desenhar?", e aí o
  // padrão entra pra quem nunca escolheu.
  const avatarAtual = avatarPorSrc(avatarUrl);
  const avatarExibido = avatarDeExibicao(avatarUrl);
  const [rascunhoAvatar, setRascunhoAvatar] = useState<string>(avatarAtual?.src ?? AVATARES[0].src);
  const [rascunhoZoom, setRascunhoZoom] = useState(avatarZoom);
  const [rascunhoFundo, setRascunhoFundo] = useState(avatarBg || AVATAR_FUNDO_PADRAO);
  const [rascunhoNome, setRascunhoNome] = useState(nomeExibicao(displayName, username));
  const [rascunhoUsername, setRascunhoUsername] = useState(username ?? "");

  const nome = nomeExibicao(displayName, username);
  const metaPercent =
    annualTarget > 0 ? Math.min(100, Math.round((totalFinished / annualTarget) * 100)) : 0;

  return (
    <div className="flex-1 bg-paper px-6 pb-24 pt-8 text-ink">
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
              className={`h-full w-full ${avatarExibido.foto ? "object-cover" : "object-contain"}`}
              style={{ transform: `scale(${avatarZoom / 100})` }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setRascunhoAvatar(avatarAtual?.src ?? AVATARES[0].src);
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

      {/* Notificações — mesmo desenho do card de Amigos, logo abaixo dele:
          os dois são "gente falando com você". */}
      <Link
        href="/notificacoes"
        className="shadow-hard mt-3 flex w-full items-center justify-between rounded-md border-2 border-ink bg-card p-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <span className="text-sm font-bold uppercase tracking-wide">Notificações</span>
        <span className="flex items-center gap-2">
          <span className={`font-display text-lg ${notificacoes > 0 ? "text-coral" : ""}`}>
            {notificacoes}
          </span>
          <span className="text-lg">›</span>
        </span>
      </Link>

      {/* Meta do ano + fase do Quill */}
      <Link
        href="/metas"
        className="shadow-hard mt-6 flex w-full gap-4 rounded-md border-2 border-ink bg-mustard p-4 text-left transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper">
          <AppImage
            // Mesmo slot da faixa de fases em /metas: cada fase mostra aqui a
            // arte que o admin escolheu lá. Antes era `perfil.fase.*`, um slot
            // à parte — o admin só alcançava pelo lápis a fase em que ele
            // próprio estava, e quem estava em outra fase via a arte padrão.
            slot={phaseImg ? `metas.fase.${faseDaImagem(phaseImg)}` : "perfil.meta-ano"}
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

      {/* A história do Quill — fora de Preferências e de Conta de propósito:
          não é ajuste nem dado, é leitura. Fica logo depois da meta do ano, que é
          onde o perfil deixa de falar de números. */}
      <Link
        href="/lore"
        className="shadow-hard mt-8 flex w-full items-center gap-3 rounded-md border-2 border-ink bg-card p-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <AppImage
          slot="perfil.lore"
          src="/img/mascot/quill-lendo.webp"
          alt=""
          aria-hidden
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 object-contain"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold uppercase tracking-wide">
            A história do Quill
          </span>
          <span className="block text-[11px] text-ink-soft">
            de onde vem o cheiro de livro novo
          </span>
        </span>
        <span className="text-lg">›</span>
      </Link>

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
          {admin && (
            <>
              <div className="border-b border-dashed border-ink/30" />
              <button
                type="button"
                onClick={() => setAberto("importar")}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <span className="block text-sm font-bold">Importar da Amazon</span>
                  <span className="block text-[11px] text-ink-soft">
                    CSV do Kindle pra estante de alguém · só admin por enquanto
                  </span>
                </span>
                <span className="text-lg">›</span>
              </button>
            </>
          )}
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
              setRascunhoAvatar(avatarAtual?.src ?? AVATARES[0].src);
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
              <AmigosDialog amigos={amigos} estantes={estantes} pedidos={pedidos} onClose={() => setAberto(null)} />
            )}
            {aberto === "foto" && (
              <EditarPerfilDialog
                nome={rascunhoNome}
                username={rascunhoUsername}
                onUsername={setRascunhoUsername}
                escolhido={rascunhoAvatar}
                zoom={rascunhoZoom}
                fundo={rascunhoFundo}
                admin={admin}
                extras={avataresExtras}
                conquistas={avataresConquista}
                onNome={setRascunhoNome}
                onEscolher={setRascunhoAvatar}
                onZoom={setRascunhoZoom}
                onFundo={setRascunhoFundo}
                onSalvar={updateAvatarAction}
                onClose={() => setAberto(null)}
              />
            )}
            {aberto === "importar" && (
              <DialogShell title="Importar da Amazon" onClose={() => setAberto(null)}>
                <ImportarAmazon />
              </DialogShell>
            )}
            {aberto === "pilulas" && (
              <PilulasDialog pilulas={pilulas} onClose={() => setAberto(null)} />
            )}
            {aberto === "ranking" && (
              <RankingDialog
                desafios={desafios}
                onToggle={toggleCompeteAction}
                onClose={() => setAberto(null)}
              />
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

/**
 * Pedidos que chegaram pra mim. Aceitar vira o status da linha que a outra
 * pessoa criou — não existe linha recíproca, `getFriends` lê os dois sentidos.
 */
function Pedidos({ pedidos }: { pedidos: PedidoRecebido[] }) {
  const router = useRouter();
  const [respondendo, iniciar] = useTransition();
  // Some da lista assim que respondido, antes mesmo do refresh chegar.
  const [respondidos, setRespondidos] = useState<string[]>([]);

  const visiveis = pedidos.filter((p) => !respondidos.includes(p.id));
  if (visiveis.length === 0) return null;

  const responder = (id: string, aceitar: boolean) => {
    setRespondidos((prev) => [...prev, id]);
    iniciar(async () => {
      await (aceitar ? aceitarPedido(id) : recusarPedido(id));
      router.refresh();
    });
  };

  return (
    <div className="mb-4">
      <p className="mb-2 font-display text-[11px] uppercase tracking-wider text-ink">
        Querem te adicionar · {visiveis.length}
      </p>
      <ul className="flex flex-col gap-1.5">
        {visiveis.map((p) => (
          <li
            key={p.id}
            className="shadow-hard-sm flex items-center gap-2 rounded-md border-2 border-mustard bg-card p-1.5"
          >
            <Avatar nome={p.nome} url={p.avatarUrl} bg={p.avatarBg} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold">{p.nome}</span>
              {p.username && (
                <span className="block truncate text-[11px] text-ink-soft">@{p.username}</span>
              )}
            </span>
            <button
              type="button"
              disabled={respondendo}
              onClick={() => responder(p.id, true)}
              className="shadow-hard-sm shrink-0 rounded-md border-2 border-ink bg-moss px-2.5 py-1.5 font-display text-[10px] uppercase tracking-wider text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
            >
              Aceitar
            </button>
            <button
              type="button"
              disabled={respondendo}
              aria-label={`Recusar pedido de ${p.nome}`}
              onClick={() => responder(p.id, false)}
              className="shadow-hard-sm shrink-0 rounded-md border-2 border-ink bg-paper px-2 py-1.5 text-[10px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AmigosDialog({
  amigos,
  estantes,
  pedidos,
  onClose,
}: {
  amigos: Friend[];
  estantes: FriendShelf[];
  pedidos: PedidoRecebido[];
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [abertoId, setAbertoId] = useState<string | null>(null);
  // Visão em grade (capa + %) sobre a lista padrão — só pro amigo aberto.
  const [modoGrade, setModoGrade] = useState(false);

  const filtrados = amigos.filter((a) =>
    a.name.toLowerCase().includes(busca.trim().toLowerCase()),
  );
  const selecionado = amigos.find((a) => a.id === abertoId) ?? null;
  const estante = estantes.find((e) => e.friendId === abertoId) ?? null;

  // ---- Estante de um amigo -------------------------------------------
  if (selecionado) {
    const livros = estante?.items ?? [];

    if (modoGrade) {
      // Mesma estante que a sua — grade, busca, filtros, paginação, % de
      // progresso — só travada pra leitura (sem editar nota, sem "adicionar
      // livro", sem guardar filtro/busca de uma visita anterior).
      const livrosParaEstante: ShelfBook[] = livros.map((l) => ({
        id: l.id,
        title: l.title,
        creator: l.creator,
        cover_kind: l.cover_kind,
        cover_url: l.cover_url,
        cover_palette: l.cover_palette,
        status: l.status as DbStatus,
        recomendado: l.is_recommended,
        stars: l.stars ?? 0,
        total_units: l.total_units,
        percent_lido: l.percent_lido,
      }));
      // Tela toda, não modal — a caixinha de 85vh do diálogo apertava demais
      // uma estante inteira (busca, filtros, grade). Portal pra escapar do
      // pano de fundo do diálogo (z-50) e da própria tab bar (z-20).
      return (
        <Portal>
          <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-paper">
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-paper px-4 py-3">
              <button
                type="button"
                onClick={() => setModoGrade(false)}
                aria-label={`Voltar para o perfil de ${selecionado.name}`}
                className="shadow-hard-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-card text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                ‹
              </button>
              <h1 className="min-w-0 truncate font-display text-base uppercase tracking-tight text-ink">
                Estante de {selecionado.name}
              </h1>
            </header>
            <EstanteShelf books={livrosParaEstante} readOnly ownerName={selecionado.name} />
          </div>
        </Portal>
      );
    }

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

        {livros.length > 0 && (
          <button
            type="button"
            onClick={() => setModoGrade(true)}
            className="shadow-hard-sm mb-3 flex w-full items-center justify-between rounded-md border-2 border-ink bg-navy px-3 py-2.5 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            Ver estante completa
            <span>›</span>
          </button>
        )}

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
                {/* Mesmo destino que a aba Amigos: a página do livro do amigo
                    (com comentários e "adicionar à minha estante"). */}
                <Link href={`/books/${l.id}`} className="flex items-start gap-3">
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
                </Link>
                {/* Fora do link — botão próprio, não pode ficar dentro de outro elemento clicável. */}
                <div className="mt-2">
                  <BotaoAddLivroAmigo itemId={l.id} />
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
      {/* Sempre no topo, inclusive sem amigo nenhum: é a saída do estado
          vazio, não um extra pra quem já tem gente. */}
      <AdicionarAmigo />

      {pedidos.length > 0 && <Pedidos pedidos={pedidos} />}

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
            Você ainda não tem amigos por aqui. Procure alguém pelo nome de usuário
            ou e-mail aí em cima — a estante de quem aceitar aparece na aba Estante.
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
                    onClick={() => {
                      setAbertoId(a.id);
                      setModoGrade(false);
                    }}
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
  admin,
  extras,
  conquistas,
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
  /** Admin adiciona (e tira) fotos das opções de avatar de todo mundo. */
  admin: boolean;
  extras: string[];
  /** Fotos de conquista: as liberadas viram opção; as outras, cadeado com dica. */
  conquistas: AvatarDeConquista[];
  onNome: (v: string) => void;
  /** Recebe o `src` da opção — é ele que vai pro banco. */
  onEscolher: (src: string) => void;
  onZoom: (z: number) => void;
  onFundo: (c: string) => void;
  onSalvar: (input: {
    nome: string;
    username: string;
    avatarSrc: string;
    zoom: number;
    fundo: string;
  }) => Promise<{ error: string | null }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSave] = useTransition();
  // O admin mexe nas opções só como rascunho: fotos novas ficam no navegador
  // (prévia local) e as tiradas só somem de verdade no "Salvar" — é aí que a
  // mudança chega pra todo mundo. Cancelar descarta tudo.
  const [novas, setNovas] = useState<{ previa: string; arquivo: File }[]>([]);
  const [removidas, setRemovidas] = useState<string[]>([]);
  const fotos = extras.filter((f) => !removidas.includes(f));
  const bloqueadas = conquistas.filter((c) => !c.liberado);
  const [dica, setDica] = useState<string | null>(null);
  const opcoes: AvatarOpcao[] = [
    ...AVATARES,
    ...conquistas
      .filter((c) => c.liberado)
      .map((c) => ({ ...avatarDeFoto(c.src), nome: c.nome })),
    ...fotos.map(avatarDeFoto),
    ...novas.map((n) => avatarDeFoto(n.previa)),
  ];
  // Foto que já saiu das opções (ou a antiga do admin, da raiz do bucket)
  // continua aparecendo pra quem está com ela.
  if (ehFotoEnviada(escolhido) && !opcoes.some((o) => o.src === escolhido)) {
    opcoes.push(avatarDeFoto(escolhido));
  }
  const arte: AvatarOpcao = opcoes.find((o) => o.src === escolhido) ?? AVATARES[0];
  const ehNova = (src: string) => novas.some((n) => n.previa === src);

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
            className={`h-full w-full ${arte.foto ? "object-cover" : "object-contain"}`}
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
        {opcoes.map((op) => {
          const ativo = op.src === escolhido;
          return (
            <div key={op.src} className="relative">
              <button
                type="button"
                aria-label={op.nome}
                aria-pressed={ativo}
                onClick={() => {
                  setDica(null);
                  onEscolher(op.src);
                }}
                style={{ backgroundColor: fundo }}
                className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border-2 border-ink ${
                  ativo ? "shadow-hard" : "opacity-70"
                }`}
              >
                <Image
                  src={op.src}
                  alt=""
                  width={72}
                  height={72}
                  unoptimized={ehNova(op.src)}
                  className={`h-full w-full ${op.foto ? "object-cover" : "object-contain"}`}
                />
              </button>
              {admin && (fotos.includes(op.src) || ehNova(op.src)) && (
                <button
                  type="button"
                  aria-label="Tirar foto das opções"
                  disabled={salvando}
                  onClick={() => {
                    setErro(null);
                    if (ehNova(op.src)) {
                      URL.revokeObjectURL(op.src);
                      setNovas((atual) => atual.filter((n) => n.previa !== op.src));
                    } else {
                      setRemovidas((atual) => [...atual, op.src]);
                    }
                    if (op.src === escolhido) onEscolher(AVATARES[0].src);
                  }}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-card text-xs font-bold leading-none"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {bloqueadas.map((c) => (
          // Cadeado: aparece pra dar vontade, mas não seleciona — tocar só
          // mostra o que falta. O servidor recusa a foto do mesmo jeito.
          <button
            key={c.src}
            type="button"
            aria-label={`${c.nome} — bloqueada. ${c.dica}`}
            onClick={() => setDica(dica === c.dica ? null : c.dica)}
            style={{ backgroundColor: fundo }}
            className="relative flex aspect-square w-full items-center justify-center rounded-full border-2 border-dashed border-ink"
          >
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <Image
                src={c.src}
                alt=""
                width={72}
                height={72}
                className="h-full w-full object-cover opacity-40 grayscale"
              />
            </span>
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-mustard">
              <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3" fill="currentColor">
                <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h.5Zm1.5 0h4V5a2 2 0 1 0-4 0v2Z" />
              </svg>
            </span>
          </button>
        ))}
        {admin && (
          // Só prévia por enquanto: o envio pra pasta `avatares/` (que é o que
          // põe a foto na grade de todo mundo) acontece no "Salvar".
          <label
            aria-label="Adicionar imagem"
            className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-ink bg-card text-center font-display text-[9px] uppercase leading-tight tracking-tight ${
              salvando ? "opacity-60" : ""
            }`}
          >
            <span className="text-lg leading-none">+</span>
            imagem
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              disabled={salvando}
              className="sr-only"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                e.target.value = "";
                if (!arquivo) return;
                setErro(null);
                const previa = URL.createObjectURL(arquivo);
                setNovas((atual) => [...atual, { previa, arquivo }]);
                onEscolher(previa);
              }}
            />
          </label>
        )}
      </div>

      {dica && (
        <p
          role="status"
          className="mt-2 rounded-md border-2 border-ink bg-mustard px-3 py-2 text-center font-display text-[10px] uppercase tracking-wider text-ink"
        >
          {dica} pra liberar esta foto
        </p>
      )}

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
              setErro(null);
              // 1) Fotos novas sobem uma por vez (cada envio tem teto de 4 MB).
              let avatarSrc = arte.src;
              const enviadas: string[] = [];
              for (const n of novas) {
                const dados = new FormData();
                dados.append("arquivo", n.arquivo);
                const r = await enviarAvatar(dados);
                if (r.error || !r.url) {
                  // As que já subiram saem do rascunho: viram opção normal.
                  setNovas((atual) => atual.filter((x) => !enviadas.includes(x.previa)));
                  if (enviadas.includes(arte.src)) onEscolher(avatarSrc);
                  setErro(r.error ?? "Não foi possível enviar a imagem.");
                  router.refresh();
                  return;
                }
                enviadas.push(n.previa);
                if (n.previa === avatarSrc) avatarSrc = r.url;
              }
              // Já no bucket: um novo "Salvar" não pode mandar de novo.
              if (novas.length) {
                setNovas([]);
                onEscolher(avatarSrc);
                router.refresh();
              }
              // 2) O perfil, antes de tirar fotos: se a pessoa largou uma foto
              //    que estava usando, a remoção não pode contar o perfil dela.
              const r = await onSalvar({ nome, username, avatarSrc, zoom, fundo });
              if (r.error) { setErro(r.error); return; }
              // 3) Fotos tiradas — recusa a que alguém ainda usa.
              for (const src of removidas) {
                const rr = await removerAvatar(src);
                if (rr.error) {
                  setRemovidas([]);
                  setErro(rr.error);
                  router.refresh();
                  return;
                }
              }
              novas.forEach((n) => URL.revokeObjectURL(n.previa));
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

// Mostra o que a pessoa realmente escolheu. Antes a lista era fixa no código,
// com nomes de métricas que nem existem mais no catálogo.
function PilulasDialog({ pilulas, onClose }: { pilulas: string[]; onClose: () => void }) {
  return (
    <DialogShell title="Pílulas do painel" onClose={onClose}>
      <ul className="space-y-2">
        {pilulas.map((p) => (
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
                titulo={d.nome}
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

/**
 * Troca de senha ali mesmo, conferindo a senha atual.
 *
 * Antes mandava pro fluxo de e-mail — que existe pra quem ESQUECEU a senha.
 * Quem lembra dela não precisa sair do app, abrir a caixa de entrada e voltar.
 * O link por e-mail continua no login, pra quem não lembra.
 */
function SenhaDialog({ onClose }: { onClose: () => void }) {
  const [state, action, pendente] = useActionState(trocarSenha, undefined);
  const erro = state && "error" in state ? state : null;
  const pronto = state && "ok" in state;

  if (pronto) {
    return (
      <DialogShell title="Senha alterada" onClose={onClose}>
        <p className="flex items-start gap-2 rounded-md border-2 border-moss bg-moss/15 px-3 py-3 text-sm text-moss-dark">
          <span aria-hidden>✓</span>
          Senha trocada. Use a nova da próxima vez que entrar.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shadow-hard mt-4 w-full rounded-md border-2 border-ink bg-moss py-3 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Fechar
        </button>
      </DialogShell>
    );
  }

  return (
    <DialogShell title="Alterar senha" onClose={onClose}>
      <form action={action} className="flex flex-col gap-4">
        <CampoSenha
          id="senha-atual"
          label="Senha atual"
          name="senha-atual"
          autoComplete="current-password"
          tom="compacto"
          erro={erro?.campo === "atual"}
        />
        <CampoSenha
          id="senha-nova"
          label="Senha nova"
          name="senha-nova"
          autoComplete="new-password"
          minLength={8}
          tom="compacto"
          erro={erro?.campo === "nova"}
        />
        <CampoSenha
          id="senha-confirmar"
          label="Confirmar senha nova"
          name="senha-confirmar"
          autoComplete="new-password"
          tom="compacto"
          erro={erro?.campo === "confirmar"}
        />
        <p className="-mt-2 text-xs text-ink-soft">Mínimo de 8 caracteres.</p>

        {erro && <p className="text-sm font-medium text-coral">{erro.error}</p>}

        <button
          type="submit"
          disabled={pendente}
          className="shadow-hard rounded-md border-2 border-ink bg-moss py-3 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
        >
          {pendente ? "Trocando…" : "Trocar senha"}
        </button>

        <Link
          href="/login?recuperar=1"
          className="text-center text-xs text-ink-soft underline underline-offset-2"
        >
          esqueci minha senha atual
        </Link>
      </form>
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
