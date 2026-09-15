import { createFileRoute } from "@tanstack/react-router";
import CrmSincronizacaoImoview from "@/crm/pages/SincronizacaoImoview";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/configuracoes/imoview")({
  component: () => (
    <RequireAuth roles={['admin','gestor']}>
      <CrmSincronizacaoImoview />
    </RequireAuth>
  ),
});
