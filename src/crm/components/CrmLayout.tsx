import { ReactNode, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CrmSidebar } from './CrmSidebar';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';
import { GlobalSearchProvider, useGlobalSearch } from '../hooks/useGlobalSearch';
import { GlobalSearch } from './GlobalSearch';
import { Search } from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
}

function SearchButton() {
  const { toggle } = useGlobalSearch();
  return (
    <button
      type="button"
      onClick={toggle}
      className="hidden md:flex items-center gap-2 px-3 h-8 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-500 transition-colors min-w-[220px]"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Buscar leads, imóveis…</span>
      <kbd className="text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
    </button>
  );
}

function HotkeyListener() {
  const { toggle } = useGlobalSearch();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
  return null;
}

function MobileSearchIcon() {
  const { toggle } = useGlobalSearch();
  return (
    <button
      type="button"
      onClick={toggle}
      className="md:hidden p-2 rounded-md hover:bg-slate-100 text-slate-600"
      aria-label="Buscar"
    >
      <Search className="h-4 w-4" />
    </button>
  );
}

export function CrmLayout({ children, title }: Props) {
  const { user } = useAuth();
  const { roles } = useRoles();

  return (
    <GlobalSearchProvider>
      <HotkeyListener />
      <GlobalSearch />
      <div className="crm-scope min-h-screen bg-slate-50 text-slate-900">
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <CrmSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-14 flex items-center justify-between border-b border-slate-200 bg-white px-4 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="text-slate-600" />
                  {title && <h1 className="text-base font-semibold text-slate-900">{title}</h1>}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <SearchButton />
                  <MobileSearchIcon />
                  <span className="hidden md:inline">{user?.email}</span>
                  {roles[0] && (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium capitalize">
                      {roles[0]}
                    </span>
                  )}
                </div>
              </header>
              <main className="flex-1 p-6 overflow-auto">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </GlobalSearchProvider>
  );
}
