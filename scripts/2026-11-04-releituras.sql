-- Releituras (2026-11-04).
-- Rodar ANTES de subir o código que lê `finished_readings`.
-- Só acrescenta uma tabela e uma view — nada existente é alterado.
--
-- O livro (`media_items.started_at/finished_at`) continua guardando a leitura
-- ATUAL. Ao começar uma releitura, a leitura terminada é copiada para
-- `past_readings` antes do livro voltar para "lendo" — assim a primeira
-- leitura continua contando no ano em que terminou.

create table if not exists public.past_readings (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.media_items(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  started_at  date,
  finished_at date,                          -- null = terminado sem data (não conta em ano nenhum)
  created_at  timestamptz not null default now()
);
create index if not exists past_readings_item_idx on public.past_readings (item_id);
create index if not exists past_readings_user_finished_idx on public.past_readings (user_id, finished_at);

alter table public.past_readings enable row level security;
create policy "own past readings - all" on public.past_readings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "friends read past readings" on public.past_readings for select to authenticated
  using (public.are_friends(auth.uid(), user_id));

-- Todo término de leitura: o atual (livro com status "terminei") + os das
-- releituras. É a fonte das contagens de "livros terminados" por período.
-- security_invoker: a view respeita a RLS de quem consulta.
create or replace view public.finished_readings with (security_invoker = true) as
  select m.id as item_id, m.user_id, m.started_at, m.finished_at, m.total_units, true as atual
  from public.media_items m
  where m.status = 'finished'
  union all
  select p.item_id, p.user_id, p.started_at, p.finished_at, m.total_units, false as atual
  from public.past_readings p
  join public.media_items m on m.id = p.item_id;
