-- Create cache table for condominiums
CREATE TABLE public.condominios_cache (
  codigo INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT,
  cidade_codigo INTEGER,
  finalidade INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX idx_condominios_cache_cidade ON condominios_cache(cidade);
CREATE INDEX idx_condominios_cache_cidade_codigo ON condominios_cache(cidade_codigo);
CREATE INDEX idx_condominios_cache_finalidade ON condominios_cache(finalidade);

-- Enable RLS but allow public read access (cache data is not sensitive)
ALTER TABLE public.condominios_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the cache
CREATE POLICY "Anyone can read condominios cache" 
ON public.condominios_cache 
FOR SELECT 
USING (true);

-- Only service role can insert/update/delete (for the sync edge function)
CREATE POLICY "Service role can manage condominios cache" 
ON public.condominios_cache 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');