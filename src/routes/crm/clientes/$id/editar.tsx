import { createFileRoute } from "@tanstack/react-router";
import CrmClienteForm from "@/crm/pages/ClienteForm";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/clientes/$id/editar")({
  component: () => (
    <RequireAuth roles={['admin','gestor','corretor']}>
      <CrmClienteForm />
    </RequireAuth>
  ),
});
