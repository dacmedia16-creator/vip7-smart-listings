import { Layout } from '@/components/Layout';
import { HeroSection } from '@/components/HeroSection';
import { PropertyTypesSection } from '@/components/PropertyTypesSection';
import { FeaturedPropertiesSection } from '@/components/FeaturedPropertiesSection';
import { ProprietariosSection } from '@/components/ProprietariosSection';
import { mockProperties } from '@/data/mockProperties';

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
        properties={mockProperties}
        finalidade="venda"
      />

      {/* Featured Rentals */}
      <FeaturedPropertiesSection
        title="Destaques para Locação"
        subtitle="As melhores opções para você alugar com segurança"
        properties={mockProperties}
        finalidade="aluguel"
      />

      {/* Proprietários */}
      <ProprietariosSection />
    </Layout>
  );
};

export default Index;
