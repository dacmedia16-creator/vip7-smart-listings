CREATE TYPE public.tipo_anuncio_portal AS ENUM ('simples','destaque','super_destaque','triple','premiere_premium','premiere_especial');

ALTER TABLE public.imovel_portais
  ADD COLUMN tipo_anuncio public.tipo_anuncio_portal NOT NULL DEFAULT 'simples';

UPDATE public.imovel_portais SET tipo_anuncio = 'destaque' WHERE destaque_portal = true;