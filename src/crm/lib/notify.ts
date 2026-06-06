import { supabase } from '@/integrations/supabase/client';

export type NotifTipo = 'lead_atribuido' | 'mudanca_etapa' | 'nova_tarefa';

export interface NotifyArgs {
  recipientUserId: string;
  tipo: NotifTipo;
  data: Record<string, any>;
}

/**
 * Dispara email + whatsapp para um usuário do CRM.
 * Falhas são silenciosas (apenas console) para não bloquear a UI.
 * As edge functions já checam preferências (notif_email / notif_whatsapp).
 */
export async function notifyUser(args: NotifyArgs) {
  if (!args.recipientUserId) return;
  const calls = [
    supabase.functions.invoke('send-lead-email', { body: args }),
    supabase.functions.invoke('send-whatsapp-ziontalk', { body: args }),
  ];
  const results = await Promise.allSettled(calls);
  results.forEach((r, i) => {
    const name = i === 0 ? 'email' : 'whatsapp';
    if (r.status === 'rejected') console.warn(`notify ${name} failed`, r.reason);
    else if ((r.value as any)?.error) console.warn(`notify ${name} error`, (r.value as any).error);
  });
}

export function crmUrl(path: string) {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
