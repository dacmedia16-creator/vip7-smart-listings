import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Imoveis from "./pages/Imoveis";
import ImovelDetail from "./pages/ImovelDetail";
import Contato from "./pages/Contato";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosUso from "./pages/TermosUso";
import NossaHistoria from "./pages/NossaHistoria";
import Avaliacao from "./pages/Avaliacao";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/imoveis" element={<Imoveis />} />
          <Route path="/imovel/:codigo" element={<ImovelDetail />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
          <Route path="/termos-uso" element={<TermosUso />} />
          <Route path="/nossa-historia" element={<NossaHistoria />} />
          <Route path="/avaliacao" element={<Avaliacao />} />
          <Route path="/condominios" element={<Imoveis />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
