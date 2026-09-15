import { createFileRoute } from "@tanstack/react-router";
import CrmImportarProprietarios from "@/crm/pages/ImportarProprietarios";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/imoveis/importar-proprietarios")({
  component: () => (
    <RequireAuth roles={['admin','gestor']}>
      <CrmImportarProprietarios />
    </RequireAuth>
  ),
});
