import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'gestor' | 'corretor' | 'atendente';

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      });
  }, [user, authLoading]);

  const hasRole = (r: AppRole) => roles.includes(r);
  const isAdmin = hasRole('admin');
  const isGestor = hasRole('gestor');
  const isCorretor = hasRole('corretor');
  const isAtendente = hasRole('atendente');
  const isManager = isAdmin || isGestor;

  return { roles, loading, hasRole, isAdmin, isGestor, isCorretor, isAtendente, isManager };
}
