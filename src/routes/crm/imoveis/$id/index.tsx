import { createFileRoute } from "@tanstack/react-router";
import CrmImovelDetail from "@/crm/pages/ImovelDetail";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/imoveis/$id/")({
  component: () => (
    <RequireAuth>
      <CrmImovelDetail />
    </RequireAuth>
  ),
});
