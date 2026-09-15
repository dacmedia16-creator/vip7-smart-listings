import { createFileRoute } from "@tanstack/react-router";
import CrmLogin from "@/crm/pages/Login";

export const Route = createFileRoute("/crm/login")({
  component: CrmLogin,
});
