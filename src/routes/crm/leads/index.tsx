import { createFileRoute } from "@tanstack/react-router";
import CrmLeads from "@/crm/pages/Leads";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/leads/")({
  component: () => (
    <RequireAuth>
      <CrmLeads />
    </RequireAuth>
  ),
});
