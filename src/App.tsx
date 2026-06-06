import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CompareProvider } from "@/contexts/CompareContext";
import Index from "./pages/Index";
import Imoveis from "./pages/Imoveis";
import ImovelDetail from "./pages/ImovelDetail";
import Contato from "./pages/Contato";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosUso from "./pages/TermosUso";
import NossaHistoria from "./pages/NossaHistoria";
import Avaliacao from "./pages/Avaliacao";
import Comparar from "./pages/Comparar";
import Leilao from "./pages/Leilao";
import AdminOgTester from "./pages/AdminOgTester";
import NotFound from "./pages/NotFound";
import CrmLogin from "./crm/pages/Login";
import CrmSetup from "./crm/pages/Setup";
import CrmDashboard from "./crm/pages/Dashboard";
import CrmSemAcesso from "./crm/pages/SemAcesso";
import CrmPlaceholder from "./crm/pages/Placeholder";
import { RequireAuth } from "./crm/components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FavoritesProvider>
          <CompareProvider>
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
                <Route path="/comparar" element={<Comparar />} />
                <Route path="/leilao" element={<Leilao />} />
              <Route path="/condominios" element={<Imoveis />} />
                <Route path="/admin/og-tester" element={<AdminOgTester />} />
                {/* CRM routes */}
                <Route path="/crm/login" element={<CrmLogin />} />
                <Route path="/crm/setup" element={<CrmSetup />} />
                <Route path="/crm/sem-acesso" element={<CrmSemAcesso />} />
                <Route path="/crm" element={<RequireAuth><CrmDashboard /></RequireAuth>} />
                <Route path="/crm/leads" element={<RequireAuth><CrmPlaceholder title="Leads" /></RequireAuth>} />
                <Route path="/crm/funil" element={<RequireAuth><CrmPlaceholder title="Funil" /></RequireAuth>} />
                <Route path="/crm/imoveis" element={<RequireAuth><CrmPlaceholder title="Imóveis" /></RequireAuth>} />
                <Route path="/crm/tarefas" element={<RequireAuth><CrmPlaceholder title="Tarefas" /></RequireAuth>} />
                <Route path="/crm/agenda" element={<RequireAuth><CrmPlaceholder title="Agenda" /></RequireAuth>} />
                <Route path="/crm/relatorios" element={<RequireAuth><CrmPlaceholder title="Relatórios" /></RequireAuth>} />
                <Route path="/crm/configuracoes" element={<RequireAuth><CrmPlaceholder title="Configurações" /></RequireAuth>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CompareProvider>
        </FavoritesProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
