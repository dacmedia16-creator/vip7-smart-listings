import { createFileRoute } from "@tanstack/react-router";
import Comparar from "@/pages/Comparar";

export const Route = createFileRoute("/comparar")({
  component: Comparar,
});
