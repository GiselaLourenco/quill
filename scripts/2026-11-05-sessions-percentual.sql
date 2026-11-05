-- Registro por % na aba Ler (2026-11-05).
-- Rodar ANTES de subir o código que grava `percent_start/percent_end`.
-- Só acrescenta colunas — nenhuma sessão existente é alterada.
--
-- O % é o que a pessoa digitou (fonte da verdade); as páginas convertidas
-- (round(% × total_units / 100)) continuam em unit_start/unit_end, e é delas
-- que métricas, desafios e conquistas leem.

alter table public.sessions add column if not exists percent_start smallint
  check (percent_start between 0 and 100);
alter table public.sessions add column if not exists percent_end smallint
  check (percent_end between 0 and 100);
comment on column public.sessions.percent_end is
  'Posição informada em % (aba Ler). unit_end guarda as páginas convertidas; se o total do livro mudar, unit_* é recalculado a partir daqui.';
