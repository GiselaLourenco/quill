-- Curtir e comentar no feed dos amigos — POR ATUALIZAÇÃO (terminou, deu nota,
-- comentou, leu…), não por livro. A atualização é identificada pela chave
-- `atualizacao` (ver `chaveAtualizacao` em src/lib/interacoes.ts), sempre junto
-- do livro. Nada de tabela de notificação: o sino lê daqui (src/lib/notificacoes.ts).

create table if not exists public.interacoes_feed (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.media_items(id) on delete cascade,
  -- dono do livro, copiado pra RLS e pro sino não precisarem de join
  dono_id     uuid not null references auth.users(id) on delete cascade,
  atualizacao text not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo        text not null check (tipo in ('curtida', 'comentario')),
  content     text,
  gif_url     text,
  created_at  timestamptz not null default now(),
  check (tipo = 'curtida' or content is not null or gif_url is not null)
);

create index if not exists interacoes_feed_item_idx on public.interacoes_feed (item_id, atualizacao);
create index if not exists interacoes_feed_dono_idx on public.interacoes_feed (dono_id, created_at desc);
create index if not exists interacoes_feed_user_idx on public.interacoes_feed (user_id, created_at desc);
-- uma curtida por pessoa por atualização
create unique index if not exists interacoes_feed_curtida_unica
  on public.interacoes_feed (item_id, atualizacao, user_id) where tipo = 'curtida';

alter table public.interacoes_feed enable row level security;

-- Vê quem vê o cartão: o dono e os amigos dele (o mesmo alcance do livro).
create policy "ler interacoes do feed" on public.interacoes_feed for select to authenticated
  using (
    dono_id = (select auth.uid())
    or user_id = (select auth.uid())
    or public.are_friends((select auth.uid()), dono_id)
  );

-- Interage quem vê o cartão, sempre em nome próprio, e o dono gravado tem que
-- ser o dono de verdade do livro.
create policy "interagir no feed" on public.interacoes_feed for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (dono_id = (select auth.uid()) or public.are_friends((select auth.uid()), dono_id))
    and dono_id = (select m.user_id from public.media_items m where m.id = item_id)
  );

-- Descurtir / apagar o próprio comentário.
create policy "apagar a propria interacao" on public.interacoes_feed for delete to authenticated
  using (user_id = (select auth.uid()));
