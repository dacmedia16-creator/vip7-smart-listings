ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS portal_origin text,
  ADD COLUMN IF NOT EXISTS portal_origin_lead_id text;

CREATE UNIQUE INDEX IF NOT EXISTS leads_portal_origin_lead_id_uniq
  ON public.leads (portal_origin, portal_origin_lead_id)
  WHERE portal_origin_lead_id IS NOT NULL;