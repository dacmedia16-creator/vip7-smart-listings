import { createFileRoute } from "@tanstack/react-router";
import CrmImoveis from "@/crm/pages/Imoveis";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/imoveis/")({
  component: () => (
    <RequireAuth>
      <CrmImoveis />
    </RequireAuth>
  ),
});
