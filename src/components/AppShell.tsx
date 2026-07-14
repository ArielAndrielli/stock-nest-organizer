import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Boxes, LayoutDashboard, PackageSearch, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGlobalSearch } from "@/lib/queries";
import { cn } from "@/lib/utils";

function NavLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === to || (to !== "/" && path.startsWith(to));
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

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
    setOpen(false);
    setQ("");
    navigate({ to: href });
  };

  return (
    <div ref={wrapRef} className="relative w-full sm:w-96">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
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
          {!isFetching && (!hits || hits.length === 0) && (
            <div className="p-3 text-sm text-muted-foreground">Nenhum resultado.</div>
          )}
          {hits && hits.length > 0 && (
            <ul className="divide-y">
              {hits.slice(0, 10).map((h) => (
                <li key={`${h.tipo}-${h.id}`}>
                  <button
                    type="button"
                    onClick={() => go(h.href)}
                    className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {h.tipo}
                      </span>
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

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Estoque</div>
              <div className="text-[11px] text-muted-foreground">Setor · Vaga · Caixa</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
            <NavLink to="/setores" icon={<PackageSearch className="h-4 w-4" />} label="Setores" />
          </nav>
          <div className="flex-1" />
          <GlobalSearch />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">{children}</main>
    </div>
  );
}
