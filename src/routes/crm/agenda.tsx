import { createFileRoute } from "@tanstack/react-router";
import CrmAgenda from "@/crm/pages/Agenda";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/agenda")({
  component: () => (
    <RequireAuth>
      <CrmAgenda />
    </RequireAuth>
  ),
});
