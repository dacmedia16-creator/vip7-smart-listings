/**
 * BACKWARDS-COMPATIBLE FACADE
 *
 * The public site reads imóveis directly from the local database
 * (`imoveis_proprios`). This module re-exports the DB-backed adapter so
 * existing consumers don't need to change their imports.
 *
 * The Imoview HTTP edge function (`imoview-api`) is still available for
 * admin tools and the sync job, but is no longer hit by public pages.
 */
export * from './imoveisDb';
