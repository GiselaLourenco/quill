-- Desafio "Livros terminados": o ranking contava +1 por QUALQUER check-in.
-- Agora conta livros distintos terminados — e o livro precisa ficar gravado
-- no próprio check-in, porque membros do desafio leem as sessões uns dos
-- outros mas não os livros (media_items só entre amigos). Sem isso o ranking
-- mudaria conforme quem está olhando.

alter table public.challenge_checkins
  add column finished_item_id uuid references public.media_items(id) on delete set null;

-- Marcar "terminei" depois de publicar atualiza os próprios check-ins.
create policy "update own checkin" on public.challenge_checkins for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Backfill: check-ins de livros já terminados dentro do período do desafio.
update public.challenge_checkins c
set finished_item_id = s.item_id
from public.sessions s, public.media_items m, public.groups g
where s.id = c.session_id
  and m.id = s.item_id
  and g.id = c.group_id
  and m.status = 'finished'
  and (m.finished_at is null
       or ((g.starts_at is null or m.finished_at >= g.starts_at)
           and (g.ends_at is null or m.finished_at <= g.ends_at)));
