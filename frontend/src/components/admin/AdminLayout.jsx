/**
 * AdminLayout — Wrapper do Backoffice.
 * Aplica data-admin (ativa CSS variables Blue/dark) e renderiza sidebar + conteudo.
 */
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  return (
    <div data-admin="" className="dark">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          {/* Header com trigger do sidebar */}
          <header className="flex h-14 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <span className="text-sm font-medium text-muted-foreground">Backoffice</span>
          </header>

          {/* Conteudo da pagina */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
