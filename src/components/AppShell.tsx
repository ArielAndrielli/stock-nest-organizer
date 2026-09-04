import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogOut, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGlobalSearch } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useMyRole } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const { data: hits, isFetching } = useGlobalSearch(debounced);

  const go = (href: string) => {
    setOpen(false); setQ("");
    navigate({ to: href });
  };

  return (
    <div ref={wrapRef} className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.trim()) {
            setOpen(false);
            navigate({ to: "/buscar", search: { q } });
          }
        }}
        placeholder="Buscar setores, vagas, caixas..."
        className="pl-9"
      />
      {open && debounced.trim() && (
        <div className="absolute z-40 mt-1 max-h-96 w-full overflow-auto rounded-lg border bg-popover shadow-lg animate-fade-in">
          {isFetching && <div className="p-3 text-sm text-muted-foreground">Buscando…</div>}
          {!isFetching && (!hits || hits.length === 0) && <div className="p-3 text-sm text-muted-foreground">Nenhum resultado.</div>}
          {hits && hits.length > 0 && (
            <ul className="divide-y">
              {hits.slice(0, 10).map((h) => (
                <li key={`${h.tipo}-${h.id}`}>
                  <button type="button" onClick={() => go(h.href)}
                    className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition-colors hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">{h.tipo}</span>
                      <span className="text-sm font-medium">{h.titulo}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{h.path.join(" → ")}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const navigate = useNavigate();
  if (!user) return null;
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();
  const roleLabel = role === "administrador" ? "Administrador" : role === "operador" ? "Operador" : "Visitante";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">{initials}</div>
          <span className="hidden sm:inline text-sm">{roleLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-xs font-normal text-muted-foreground">{roleLabel}</div>
          <div className="truncate text-sm">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === "administrador" && (
          <DropdownMenuItem onSelect={() => navigate({ to: "/admin/usuarios" })}>
            <Users className="mr-2 h-4 w-4" /> Usuários
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
              <SidebarTrigger />
              <div className="flex-1" />
              <GlobalSearch />
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

