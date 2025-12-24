import { createContext, useContext, ReactNode } from 'react';
import { useCompare } from '@/hooks/useCompare';

type CompareContextType = ReturnType<typeof useCompare>;

const CompareContext = createContext<CompareContextType | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const compare = useCompare();
  return (
    <CompareContext.Provider value={compare}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompareContext() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompareContext must be used within CompareProvider');
  }
  return context;
}
