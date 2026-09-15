import { createFileRoute } from "@tanstack/react-router";
import CrmSemAcesso from "@/crm/pages/SemAcesso";

export const Route = createFileRoute("/crm/sem-acesso")({
  component: CrmSemAcesso,
});
