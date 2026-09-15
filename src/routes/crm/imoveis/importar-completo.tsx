import { createFileRoute } from "@tanstack/react-router";
import CrmImportarImoveisCompleto from "@/crm/pages/ImportarImoveisCompleto";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/imoveis/importar-completo")({
  component: () => (
    <RequireAuth roles={['admin','gestor']}>
      <CrmImportarImoveisCompleto />
    </RequireAuth>
  ),
});
