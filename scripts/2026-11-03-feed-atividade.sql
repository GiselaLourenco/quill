-- Feed dos amigos ordenado pela última atualização.
-- O banco não guardava QUANDO o status de um livro mudou nem quando uma nota
-- foi editada (o upsert mantém o created_at). Duas colunas novas, mantidas por
-- trigger, resolvem sem tocar em nenhuma action.

-- ---- media_items.status_changed_at ---------------------------------------
alter table public.media_items add column if not exists status_changed_at timestamptz;

-- Backfill: terminado/lendo usam a data informada (meio-dia no Brasil), sem
-- passar de agora nem ficar antes do cadastro; o resto, o próprio cadastro.
update public.media_items set status_changed_at = case
  when status = 'finished' and finished_at is not null then
    least(now(), greatest(created_at, (finished_at + time '12:00') at time zone 'America/Sao_Paulo'))
  when status = 'reading' and started_at is not null then
    least(now(), greatest(created_at, (started_at + time '12:00') at time zone 'America/Sao_Paulo'))
  else created_at
end
where status_changed_at is null;

alter table public.media_items alter column status_changed_at set default now();
alter table public.media_items alter column status_changed_at set not null;

create or replace function public.media_items_status_changed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := coalesce(new.created_at, now());
  elsif new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists media_items_status_changed_at on public.media_items;
create trigger media_items_status_changed_at
  before insert or update of status on public.media_items
  for each row execute function public.media_items_status_changed_at();

-- ---- ratings.updated_at ---------------------------------------------------
alter table public.ratings add column if not exists updated_at timestamptz;
update public.ratings set updated_at = created_at where updated_at is null;
alter table public.ratings alter column updated_at set default now();
alter table public.ratings alter column updated_at set not null;

create or replace function public.ratings_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.stars is distinct from old.stars then
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists ratings_updated_at on public.ratings;
create trigger ratings_updated_at
  before update on public.ratings
  for each row execute function public.ratings_updated_at();
