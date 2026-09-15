import { createFileRoute } from "@tanstack/react-router";
import CrmFunil from "@/crm/pages/Funil";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/funil")({
  component: () => (
    <RequireAuth>
      <CrmFunil />
    </RequireAuth>
  ),
});
