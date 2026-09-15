import { createFileRoute } from "@tanstack/react-router";
import CrmImovelForm from "@/crm/pages/ImovelForm";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/imoveis/$id/editar")({
  component: () => (
    <RequireAuth roles={['admin','gestor','corretor']}>
      <CrmImovelForm />
    </RequireAuth>
  ),
});
