import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CrmSidebar } from './CrmSidebar';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';

interface Props {
  children: ReactNode;
  title?: string;
}

export function CrmLayout({ children, title }: Props) {
  const { user } = useAuth();
  const { roles } = useRoles();

  return (
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
  );
}
