import { createFileRoute } from "@tanstack/react-router";
import CrmImportarLeads from "@/crm/pages/ImportarLeads";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/leads/importar")({
  component: () => (
    <RequireAuth roles={['admin','gestor']}>
      <CrmImportarLeads />
    </RequireAuth>
  ),
});
