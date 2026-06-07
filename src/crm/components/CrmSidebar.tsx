import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Building2,
  CheckSquare,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  RefreshCw,
  Building,

} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useRoles } from '../hooks/useRole';
import { signOut } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const items = [
  { title: 'Dashboard', url: '/crm', icon: LayoutDashboard, roles: ['admin', 'gestor', 'corretor', 'atendente'] },
  { title: 'Leads', url: '/crm/leads', icon: Users, roles: ['admin', 'gestor', 'corretor', 'atendente'] },
  { title: 'Funil', url: '/crm/funil', icon: KanbanSquare, roles: ['admin', 'gestor', 'corretor'] },
  { title: 'Imóveis', url: '/crm/imoveis', icon: Building2, roles: ['admin', 'gestor', 'corretor'] },
  { title: 'Condomínios', url: '/crm/condominios', icon: Building, roles: ['admin', 'gestor', 'corretor'] },
  { title: 'Tarefas', url: '/crm/tarefas', icon: CheckSquare, roles: ['admin', 'gestor', 'corretor', 'atendente'] },
  { title: 'Agenda', url: '/crm/agenda', icon: Calendar, roles: ['admin', 'gestor', 'corretor'] },
  { title: 'Relatórios', url: '/crm/relatorios', icon: BarChart3, roles: ['admin', 'gestor'] },
  { title: 'Configurações', url: '/crm/configuracoes', icon: Settings, roles: ['admin', 'gestor'] },
  { title: 'Sincronizar Imoview', url: '/crm/configuracoes/imoview', icon: RefreshCw, roles: ['admin', 'gestor'] },
];

export function CrmSidebar() {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { roles } = useRoles();
  const navigate = useNavigate();

  const visible = items.filter((it) => it.roles.some((r) => roles.includes(r as any)));
  const isActive = (url: string) => (url === '/crm' ? pathname === '/crm' : pathname.startsWith(url));

  return (
    <Sidebar collapsible="icon" className="border-r border-[#E8E4D9] bg-white">
      <SidebarHeader className="border-b border-[#E8E4D9] bg-white">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-lg bg-[#C9A24C] flex items-center justify-center text-[#0F0F12] font-bold">V7</div>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold text-[#0F0F12]">VIP7 CRM</div>
              <div className="text-xs text-[#4A4A52]">Gestão imobiliária</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#4A4A52]">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="relative text-[#1A1A1F] font-medium data-[active=true]:bg-[#FBF3DC] data-[active=true]:text-[#7A5A14] data-[active=true]:font-semibold data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r data-[active=true]:before:bg-[#C9A24C] hover:bg-[#F5F0E4] hover:text-[#0F0F12]"
                  >
                    <NavLink to={item.url} end={item.url === '/crm'}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-[#E8E4D9] bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await signOut();
                navigate('/crm/login');
              }}
              className="text-[#2A2A30] hover:bg-[#FAF8F3]"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
