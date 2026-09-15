import { createFileRoute } from "@tanstack/react-router";
import CrmConfiguracoes from "@/crm/pages/Configuracoes";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/configuracoes/")({
  component: () => (
    <RequireAuth>
      <CrmConfiguracoes />
    </RequireAuth>
  ),
});
