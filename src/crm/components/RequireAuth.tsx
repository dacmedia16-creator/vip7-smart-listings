import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRoles, type AppRole } from '../hooks/useRole';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  roles?: AppRole[];
}

export function RequireAuth({ children, roles }: Props) {
  const { user, loading } = useAuth();
  const { roles: userRoles, loading: rolesLoading } = useRoles();
  const location = useLocation();

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7A7A80]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/crm/login" state={{ from: location }} replace />;
  }

  if (userRoles.length === 0) {
    return <Navigate to="/crm/sem-acesso" replace />;
  }

  if (roles && !roles.some((r) => userRoles.includes(r))) {
    return <Navigate to="/crm" replace />;
  }

  return <>{children}</>;
}
