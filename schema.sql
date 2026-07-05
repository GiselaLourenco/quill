-- ============================================================
-- Quill — Schema inicial (Supabase / Postgres)
-- v1: apenas livros (type = 'book'); jogos entram depois (type = 'game').
-- Ponto de partida — revisar/ajustar no Claude Code conforme evoluir.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- PROFILES (estende auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  display_name  text,
  avatar_url    text,
  metrics_prefs jsonb not null default '[]'::jsonb,  -- pílulas de insight ativadas
  created_at    timestamptz not null default now()
);

-- cria profile automaticamente ao criar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- MEDIA_ITEMS (livros hoje; jogos no futuro)
-- ------------------------------------------------------------
create table public.media_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'book' check (type in ('book','game')),
  title       text not null,
  creator     text,                          -- autor / estúdio
  cover_url   text,                          -- usado quando cover_kind = 'real'
  cover_kind  text not null default 'illustrated'
              check (cover_kind in ('real','illustrated')),
  cover_palette smallint not null default 0
              check (cover_palette between 0 and 3), -- índice na paleta leve (globals.css)
  total_units int,                           -- páginas / fases
  status      text not null default 'reading'
              check (status in ('want','reading','finished','abandoned','platinum')),
  spotify_url text,
  started_at  date,
  finished_at date,
  created_at  timestamptz not null default now()
);
create index on public.media_items (user_id);

-- ------------------------------------------------------------
-- SESSIONS (leitura / jogatina)
-- ------------------------------------------------------------
create table public.sessions (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid references public.media_items(id) on delete cascade, -- null = sessão livre (aba "Ler"), sem livro vinculado
  user_id          uuid not null references auth.users(id) on delete cascade,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_seconds int,
  unit_start       int,                       -- página/fase inicial
  unit_end         int,                       -- página/fase final (usado na trava de spoiler)
  chapter_start     int,                      -- capítulo anterior (p/ pílula capítulos/semana)
  chapter_end       int,                      -- capítulo informado nesta sessão (valor absoluto)
  quality_tags     text[] not null default '{}', -- {'no_distractions','flowed','phone','hard'}
  created_at       timestamptz not null default now()
);
create index on public.sessions (user_id, started_at);
create index on public.sessions (item_id);

-- ------------------------------------------------------------
-- HIGHLIGHTS (fotos de trechos / prints de momentos)
-- ------------------------------------------------------------
create table public.highlights (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.media_items(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  image_url  text,
  unit_ref   int,                             -- página / fase
  note       text,
  is_public  boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.highlights (item_id);

-- ------------------------------------------------------------
-- COMMENTS (livro / capítulo / passagem) + GIF
-- ------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid references public.media_items(id) on delete cascade, -- null quando scope='checkin'
  user_id     uuid not null references auth.users(id) on delete cascade,
  scope       text not null default 'item' check (scope in ('item','chapter','passage','checkin')),
  chapter_ref int,                            -- capítulo (para trava de spoiler)
  passage_ref uuid references public.highlights(id) on delete cascade,
  checkin_id  uuid references public.challenge_checkins(id) on delete cascade, -- scope='checkin'
  content     text,                           -- reação = o próprio emoji; resposta = texto normal
  gif_url     text,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.comments (item_id);

-- ------------------------------------------------------------
-- RATINGS (nota por item, 1 por usuário)
-- ------------------------------------------------------------
create table public.ratings (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.media_items(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  stars      int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  unique (item_id, user_id)
);

-- ------------------------------------------------------------
-- GOALS (metas de leitura)
-- ------------------------------------------------------------
create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null,                 -- books_per_year, pages_per_day, minutes_per_day...
  target_value numeric not null,
  period_start date,
  period_end   date,
  created_at   timestamptz not null default now()
);
create index on public.goals (user_id);

-- ------------------------------------------------------------
-- USER_ACHIEVEMENTS (catálogo de conquistas vive em código, só o
-- desbloqueio é persistido aqui — ver src/lib/achievements.ts)
-- ------------------------------------------------------------
create table public.user_achievements (
  user_id         uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at     timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

-- ------------------------------------------------------------
-- GROUPS (desafio / clube)
-- ------------------------------------------------------------
create table public.groups (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  emoji          text,                       -- "capa" leve do desafio (sem upload), ex.: 🏆
  format         text not null default 'club' check (format in ('challenge','club')),
  item_id        uuid references public.media_items(id) on delete set null,
  scoring_metric text not null default 'pages'
                 check (scoring_metric in ('pages','active_days','check_ins','chapters','minutes')),
  created_by     uuid not null references auth.users(id) on delete cascade,
  invite_code    text unique default encode(gen_random_bytes(6),'hex'),
  starts_at      date,
  ends_at        date,
  created_at     timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','member')),
  competes  boolean not null default false,   -- opt-in individual no placar
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_schedule (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references public.groups(id) on delete cascade,
  unit      text not null check (unit in ('chapter','page')),
  start_ref int,
  end_ref   int,
  due_date  date,
  label     text
);

-- ------------------------------------------------------------
-- CHALLENGE_CHECKINS (uma sessão publicada num desafio — a "prova" é o
-- registro de progresso; foto/nota são opcionais)
-- ------------------------------------------------------------
create table public.challenge_checkins (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  photo_path text,                            -- bucket privado challenge-photos
  note       text,
  created_at timestamptz not null default now(),
  unique (group_id, session_id)
);

-- ------------------------------------------------------------
-- FRIENDSHIPS
-- ------------------------------------------------------------
create table public.friendships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  friend_id  uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

-- ------------------------------------------------------------
-- RECOMMENDATIONS (amigo -> amigo; e futuro n8n via source='system')
-- ------------------------------------------------------------
create table public.recommendations (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid references auth.users(id) on delete set null,
  to_user_id   uuid not null references auth.users(id) on delete cascade,
  item_ref     uuid references public.media_items(id) on delete set null,
  title        text,                          -- caso o livro ainda não esteja cadastrado
  message      text,
  source       text not null default 'friend' check (source in ('friend','system')),
  status       text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  created_at   timestamptz not null default now()
);
create index on public.recommendations (to_user_id);

-- ============================================================
-- RLS
-- ============================================================

-- helper com SECURITY DEFINER evita recursão nas policies de grupo
create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = uid);
$$;

-- profiles
alter table public.profiles enable row level security;
create policy "profiles read (auth)" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

-- media_items (privado ao dono)
alter table public.media_items enable row level security;
create policy "own items - all" on public.media_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions (privado ao dono)
alter table public.sessions enable row level security;
create policy "own sessions - all" on public.sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- highlights (dono; leitura pública quando is_public)
alter table public.highlights enable row level security;
create policy "own highlights - all" on public.highlights for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public highlights - read" on public.highlights for select to authenticated
  using (is_public = true);

-- comments (dono; leitura pública quando is_public — spoiler tratado na app)
alter table public.comments enable row level security;
create policy "own comments - all" on public.comments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public comments - read" on public.comments for select to authenticated
  using (is_public = true);
create policy "members read checkin comments" on public.comments for select to authenticated
  using (
    scope = 'checkin'
    and exists (
      select 1 from public.challenge_checkins c
      where c.id = comments.checkin_id
        and public.is_group_member(c.group_id, auth.uid())
    )
  );

-- ratings (dono escreve; autenticados leem, p/ média)
alter table public.ratings enable row level security;
create policy "ratings - read" on public.ratings for select to authenticated using (true);
create policy "own ratings - write" on public.ratings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- goals (privado)
alter table public.goals enable row level security;
create policy "own goals - all" on public.goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_achievements (privado)
alter table public.user_achievements enable row level security;
create policy "own achievements - all" on public.user_achievements for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- groups (membros leem; criador gerencia)
alter table public.groups enable row level security;
create policy "group read (member/owner)" on public.groups for select to authenticated
  using (created_by = auth.uid() or public.is_group_member(id, auth.uid()));
create policy "create group" on public.groups for insert to authenticated
  with check (created_by = auth.uid());
create policy "owner updates group" on public.groups for update using (created_by = auth.uid());
create policy "owner deletes group" on public.groups for delete using (created_by = auth.uid());

-- group_members
alter table public.group_members enable row level security;
create policy "read members of my groups" on public.group_members for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));
create policy "join group (self)" on public.group_members for insert to authenticated
  with check (user_id = auth.uid());
create policy "update own membership" on public.group_members for update using (user_id = auth.uid());
create policy "leave group (self)" on public.group_members for delete using (user_id = auth.uid());

-- group_schedule
alter table public.group_schedule enable row level security;
create policy "members read schedule" on public.group_schedule for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));
create policy "owner writes schedule" on public.group_schedule for all
  using (exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid()));

-- challenge_checkins (membros leem; cada um publica/apaga o próprio)
alter table public.challenge_checkins enable row level security;
create policy "members read checkins" on public.challenge_checkins for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));
create policy "publish own checkin" on public.challenge_checkins for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id, auth.uid()));
create policy "delete own checkin" on public.challenge_checkins for delete
  using (user_id = auth.uid());

-- friendships
alter table public.friendships enable row level security;
create policy "read own friendships" on public.friendships for select to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());
create policy "create friend request" on public.friendships for insert to authenticated
  with check (user_id = auth.uid());
create policy "update friendship" on public.friendships for update
  using (user_id = auth.uid() or friend_id = auth.uid());
create policy "delete own friendship" on public.friendships for delete
  using (user_id = auth.uid() or friend_id = auth.uid());

-- recommendations
alter table public.recommendations enable row level security;
create policy "read my recs" on public.recommendations for select to authenticated
  using (to_user_id = auth.uid() or from_user_id = auth.uid());
create policy "send rec" on public.recommendations for insert to authenticated
  with check (from_user_id = auth.uid());
create policy "update received rec" on public.recommendations for update
  using (to_user_id = auth.uid());

-- ============================================================
-- STORAGE (buckets + policies; arquivos organizados por pasta = user_id)
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('covers','covers', true),
  ('highlights','highlights', false),
  ('avatars','avatars', true),
  ('challenge-photos','challenge-photos', false)
on conflict (id) do nothing;

create policy "upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('covers','highlights','avatars')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "manage own files" on storage.objects for update to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own files" on storage.objects for delete to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text);
create policy "public read covers/avatars" on storage.objects for select
  using (bucket_id in ('covers','avatars'));
create policy "read own highlights" on storage.objects for select to authenticated
  using (bucket_id = 'highlights' and (storage.foldername(name))[1] = auth.uid()::text);

-- challenge-photos: pasta = group_id (não user_id), porque qualquer membro
-- do desafio precisa ver a foto de check-in de qualquer outro membro.
create policy "members upload challenge photo" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'challenge-photos'
    and public.is_group_member((storage.foldername(name))[1]::uuid, auth.uid())
  );
create policy "members read challenge photos" on storage.objects for select to authenticated
  using (
    bucket_id = 'challenge-photos'
    and public.is_group_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

-- NOTA: para "trechos públicos" (Wattpad-style), highlights públicos precisarão de
-- leitura pública do arquivo — resolver com bucket público dedicado ou signed URLs
-- quando implementar essa parte (fase social).
