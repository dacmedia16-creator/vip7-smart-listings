import { createFileRoute } from "@tanstack/react-router";
import CrmLeadDetail from "@/crm/pages/LeadDetail";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/leads/$id/")({
  component: () => (
    <RequireAuth>
      <CrmLeadDetail />
    </RequireAuth>
  ),
});
