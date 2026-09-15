import { createFileRoute } from "@tanstack/react-router";
import CrmSetup from "@/crm/pages/Setup";

export const Route = createFileRoute("/crm/setup")({
  component: CrmSetup,
});
