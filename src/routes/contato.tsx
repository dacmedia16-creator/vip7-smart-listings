import { createFileRoute } from "@tanstack/react-router";
import Contato from "@/pages/Contato";

export const Route = createFileRoute("/contato")({
  component: Contato,
});
