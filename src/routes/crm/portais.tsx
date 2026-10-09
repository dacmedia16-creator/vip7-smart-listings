import { createFileRoute } from "@tanstack/react-router";
import CrmPortais from "@/crm/pages/Portais";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/portais")({
  head: () => ({ meta: [
    { title: 'Portais e pacote Zap | VIP7 CRM' },
    { name: 'description', content: 'Publicações e consumo do pacote de anúncios Zap + VivaReal no VIP7 CRM.' },
    { property: 'og:title', content: 'Portais e pacote Zap | VIP7 CRM' },
    { property: 'og:description', content: 'Gerencie tipos de anúncio e limites do pacote Zap + VivaReal.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => (
    <RequireAuth roles={['admin','gestor']}>
      <CrmPortais />
    </RequireAuth>
  ),
});
