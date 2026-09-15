import { createFileRoute } from "@tanstack/react-router";
import AdminOgTester from "@/pages/AdminOgTester";

export const Route = createFileRoute("/admin/og-tester")({
  component: AdminOgTester,
});
