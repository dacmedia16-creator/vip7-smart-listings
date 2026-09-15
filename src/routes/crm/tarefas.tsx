import { createFileRoute } from "@tanstack/react-router";
import CrmTarefas from "@/crm/pages/Tarefas";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/tarefas")({
  component: () => (
    <RequireAuth>
      <CrmTarefas />
    </RequireAuth>
  ),
});
