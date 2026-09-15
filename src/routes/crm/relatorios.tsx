import { createFileRoute } from "@tanstack/react-router";
import CrmRelatorios from "@/crm/pages/Relatorios";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/relatorios")({
  component: () => (
    <RequireAuth>
      <CrmRelatorios />
    </RequireAuth>
  ),
});
