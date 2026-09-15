import { createFileRoute } from "@tanstack/react-router";
import CrmDashboard from "@/crm/pages/Dashboard";
import { RequireAuth } from "@/crm/components/RequireAuth";

export const Route = createFileRoute("/crm/")({
  component: () => (
    <RequireAuth>
      <CrmDashboard />
    </RequireAuth>
  ),
});
