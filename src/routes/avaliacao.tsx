import { createFileRoute } from "@tanstack/react-router";
import Avaliacao from "@/pages/Avaliacao";

export const Route = createFileRoute("/avaliacao")({
  component: Avaliacao,
});
