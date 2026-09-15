import { createFileRoute } from "@tanstack/react-router";
import CrmPortais from "@/crm/pages/Portais";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/portais")({
  component: () => (
    <RequireAuth roles={['admin','gestor']}>
      <CrmPortais />
    </RequireAuth>
  ),
});
