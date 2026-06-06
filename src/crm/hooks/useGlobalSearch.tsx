import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const GlobalSearchContext = createContext<Ctx | null>(null);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return (
    <GlobalSearchContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) throw new Error('useGlobalSearch must be used inside GlobalSearchProvider');
  return ctx;
}
