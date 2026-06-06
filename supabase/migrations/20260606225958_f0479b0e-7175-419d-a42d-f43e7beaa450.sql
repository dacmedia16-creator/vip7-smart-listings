
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS lembrete_1d_em timestamptz,
  ADD COLUMN IF NOT EXISTS lembrete_2h_em timestamptz,
  ADD COLUMN IF NOT EXISTS lembrete_30min_em timestamptz;

CREATE INDEX IF NOT EXISTS tarefas_data_hora_pendente_idx
  ON public.tarefas (data_hora)
  WHERE status = 'pendente';

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
