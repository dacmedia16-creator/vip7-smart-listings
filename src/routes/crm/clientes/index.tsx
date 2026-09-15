import { createFileRoute } from "@tanstack/react-router";
import CrmClientes from "@/crm/pages/Clientes";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/clientes/")({
  component: () => (
    <RequireAuth roles={['admin','gestor','corretor']}>
      <CrmClientes />
    </RequireAuth>
  ),
});
