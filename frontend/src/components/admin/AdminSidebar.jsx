/**
 * AdminSidebar — Navegação lateral do Backoffice.
 * Usa shadcn/ui Sidebar components.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Tag,
  Layers,
  Brain,
  Mail,
  Plug,
  ScrollText,
  Settings,
  LogOut,
  ChevronUp,
  Shield,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '../ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const NAV_MAIN = [
  { title: 'Overview', icon: LayoutDashboard, path: '/admin' },
  { title: 'Usuários', icon: Users, path: '/admin/users' },
  { title: 'Financeiro', icon: CreditCard, path: '/admin/financial' },
  { title: 'Cupons', icon: Tag, path: '/admin/coupons' },
  { title: 'Planos', icon: Layers, path: '/admin/plans' },
  { title: 'IA / Custos', icon: Brain, path: '/admin/ai-costs' },
];

const NAV_SECONDARY = [
  { title: 'E-mails', icon: Mail, path: '/admin/emails' },
  { title: 'Integrações', icon: Plug, path: '/admin/integrations' },
  { title: 'Logs', icon: ScrollText, path: '/admin/logs' },
];

export default function AdminSidebar() {
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin' || location.pathname === '/admin/overview';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header com logo */}
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Shield className="h-6 w-6 text-blue-500 shrink-0" />
          <span className="text-sm font-semibold tracking-wide text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            VAGATO Backoffice
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Menu principal */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_MAIN.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_SECONDARY.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer com user menu */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shrink-0">
                    {admin?.email?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="flex flex-col text-left text-xs leading-tight">
                    <span className="font-medium truncate">{admin?.email || 'Admin'}</span>
                    <span className="text-muted-foreground capitalize">{admin?.role || 'admin'}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
