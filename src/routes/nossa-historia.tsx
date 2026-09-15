import { createFileRoute } from "@tanstack/react-router";
import NossaHistoria from "@/pages/NossaHistoria";

export const Route = createFileRoute("/nossa-historia")({
  component: NossaHistoria,
});
