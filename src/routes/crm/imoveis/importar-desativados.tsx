import { createFileRoute } from "@tanstack/react-router";
import CrmImportarImoveisDesativados from "@/crm/pages/ImportarImoveisDesativados";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/imoveis/importar-desativados")({
  component: () => (
    <RequireAuth roles={['admin','gestor']}>
      <CrmImportarImoveisDesativados />
    </RequireAuth>
  ),
});
