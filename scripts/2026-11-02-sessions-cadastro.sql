-- Sessões de cadastro da estante (2026-11-02).
-- Rodar ANTES de subir o código que filtra por `cadastro`.
-- Só acrescenta uma coluna e marca linhas — nada é apagado nem alterado nas
-- posições, durações ou datas das sessões.

alter table public.sessions add column if not exists cadastro boolean not null default false;
comment on column public.sessions.cadastro is
  'Posição informada ao montar a estante (0 → X, sem leitura cronometrada antes no livro). Vale pra página atual, não pras métricas de leitura.';

update public.sessions s
set cadastro = true
where s.item_id is not null
  and coalesce(s.duration_seconds, 0) = 0
  and (
    (s.unit_end is not null and coalesce(s.unit_start, 0) = 0)
    or (s.chapter_end is not null and coalesce(s.chapter_start, 0) = 0)
  )
  and not exists (
    select 1 from public.sessions r
    where r.item_id = s.item_id
      and coalesce(r.duration_seconds, 0) > 0
      and r.created_at < s.created_at
  );
