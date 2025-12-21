import { Layout } from '@/components/Layout';
import { HeroSection } from '@/components/HeroSection';
import { PropertyTypesSection } from '@/components/PropertyTypesSection';
import { FeaturedPropertiesSection } from '@/components/FeaturedPropertiesSection';
import { QuemSomosSection } from '@/components/QuemSomosSection';
import { DiferenciaisSection } from '@/components/DiferenciaisSection';
import { ProprietariosSection } from '@/components/ProprietariosSection';

const Index = () => {
  return (
    <Layout>
      {/* Hero with Search */}
      <HeroSection />

      {/* Property Types */}
      <PropertyTypesSection />

      {/* Featured Sales */}
      <FeaturedPropertiesSection
        title="Destaques para Venda"
        subtitle="Imóveis selecionados com as melhores oportunidades de investimento"
        finalidade="venda"
      />

      {/* Quem Somos */}
      <QuemSomosSection />

      {/* Featured Rentals */}
      <FeaturedPropertiesSection
        title="Destaques para Locação"
        subtitle="As melhores opções para você alugar com segurança"
        finalidade="aluguel"
      />

      {/* Diferenciais */}
      <DiferenciaisSection />

      {/* Proprietários */}
      <ProprietariosSection />
    </Layout>
  );
};

export default Index;