import { createFileRoute } from "@tanstack/react-router";
import ImovelDetail from "@/pages/ImovelDetail";

export const Route = createFileRoute("/imovel/$codigo")({
  component: ImovelDetail,
});
