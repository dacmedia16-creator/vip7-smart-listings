import { createFileRoute } from "@tanstack/react-router";
import Leilao from "@/pages/Leilao";

export const Route = createFileRoute("/leilao")({
  component: Leilao,
});
