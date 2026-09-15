import { createFileRoute } from "@tanstack/react-router";
import CrmCondominios from "@/crm/pages/Condominios";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/condominios/")({
  component: () => (
    <RequireAuth>
      <CrmCondominios />
    </RequireAuth>
  ),
});
