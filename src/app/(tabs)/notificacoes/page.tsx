import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getNotificacoes } from "@/lib/notificacoes";
import { NotificacoesLista } from "@/components/notificacoes-lista";

export default async function NotificacoesPage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const notificacoes = await getNotificacoes(supabase, userId);

  return (
    <div className="flex flex-1 flex-col bg-paper px-5 pb-8 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Voltar para a home"
          className="shadow-hard-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-card font-display text-lg leading-none text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ‹
        </Link>
        <h1 className="font-display text-2xl uppercase leading-none tracking-tight text-ink">
          Notificações
        </h1>
        {notificacoes.length > 0 && (
          <span className="shadow-hard-sm ml-auto rounded-md border-2 border-ink bg-mustard px-2 py-1 font-display text-[10px] uppercase text-ink">
            {notificacoes.length}
          </span>
        )}
      </header>

      <NotificacoesLista inicial={notificacoes} />
    </div>
  );
}
