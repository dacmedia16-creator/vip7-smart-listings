import { createFileRoute } from "@tanstack/react-router";
import CrmClienteDetail from "@/crm/pages/ClienteDetail";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/clientes/$id/")({
  component: () => (
    <RequireAuth roles={['admin','gestor','corretor']}>
      <CrmClienteDetail />
    </RequireAuth>
  ),
});
