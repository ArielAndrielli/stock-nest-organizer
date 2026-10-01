import { Link, useRouterState } from "@tanstack/react-router";
import { Boxes, CalendarDays, ScanLine, ClipboardList, Factory, LayoutDashboard, Package, PackageSearch, Printer, Truck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Setores", url: "/setores", icon: PackageSearch },
  { title: "Itens", url: "/itens", icon: Package },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck },
  { title: "Pré-Entrada", url: "/pre-entrada", icon: ScanLine },
  { title: "Ordens", url: "/ordens", icon: Factory },
  { title: "Histórico", url: "/historico", icon: ClipboardList },
  { title: "Calendário", url: "/calendario", icon: CalendarDays },
  { title: "Etiquetas", url: "/etiquetas", icon: Printer },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-1 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Boxes className="h-4 w-4" />
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-semibold">Estoque</div>
            <div className="text-[11px] text-muted-foreground">Setor · Vaga · Caixa</div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
