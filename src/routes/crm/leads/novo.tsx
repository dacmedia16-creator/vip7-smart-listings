import { createFileRoute } from "@tanstack/react-router";
import CrmLeadForm from "@/crm/pages/LeadForm";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/leads/novo")({
  component: () => (
    <RequireAuth>
      <CrmLeadForm />
    </RequireAuth>
  ),
});
