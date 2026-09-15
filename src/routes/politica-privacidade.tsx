import { createFileRoute } from "@tanstack/react-router";
import PoliticaPrivacidade from "@/pages/PoliticaPrivacidade";

export const Route = createFileRoute("/politica-privacidade")({
  component: PoliticaPrivacidade,
});
