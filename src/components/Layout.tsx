import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { CompareDrawer } from '@/components/CompareDrawer';

interface LayoutProps {
  children: ReactNode;
  whatsappPhone?: string;
}

export function Layout({ children, whatsappPhone }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16">
        {children}
      </main>
      <Footer />
      <WhatsAppButton phone={whatsappPhone} />
      <CompareDrawer />
    </div>
  );
}
