import { createFileRoute } from "@tanstack/react-router";
import CrmImportarClientes from "@/crm/pages/ImportarClientes";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/clientes/importar")({
  component: () => (
    <RequireAuth roles={['admin','gestor']}>
      <CrmImportarClientes />
    </RequireAuth>
  ),
});
