import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { FloatingAvaliacaoButton } from '@/components/FloatingAvaliacaoButton';
import { CompareDrawer } from '@/components/CompareDrawer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16">
        {children}
      </main>
      <Footer />
      <FloatingAvaliacaoButton />
      <WhatsAppButton />
      <CompareDrawer />
    </div>
  );
}
