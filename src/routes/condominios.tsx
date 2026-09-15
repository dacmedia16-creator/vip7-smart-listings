import { createFileRoute } from "@tanstack/react-router";
import Imoveis from "@/pages/Imoveis";

export const Route = createFileRoute("/condominios")({
  component: Imoveis,
});
