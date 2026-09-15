import { createFileRoute } from "@tanstack/react-router";
import CrmCondominioDetail from "@/crm/pages/CondominioDetail";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/condominios/$codigo")({
  component: () => (
    <RequireAuth>
      <CrmCondominioDetail />
    </RequireAuth>
  ),
});
