import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardList, LayoutGrid, Plus, Rows3, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-auth";
import { NovaOrdem } from "@/components/ordens/NovaOrdem";
import {
  STATUS_CLASSE,
  STATUS_ORDEM,
  STATUS_ROTULO,
  useAtualizarStatus,
  useExcluirOrdem,
  useOrdens,
  type Ordem,
  type StatusOrdem,
} from "@/lib/ordens";

export const Route = createFileRoute("/_authenticated/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de Produção · Estoque" },
      {
        name: "description",
        content: "Crie e acompanhe ordens de produção em grade ou Kanban, com materiais vindos do cadastro de itens.",
      },
      { property: "og:title", content: "Ordens de Produção · Estoque" },
      {
        property: "og:description",
        content: "Fluxo completo de ordens de produção: separação, conclusão e cancelamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdensPage,
});

function OrdensPage() {
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePermissions();
  const [modo, setModo] = useState<"grid" | "kanban">("kanban");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [novo, setNovo] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);

  const { data: ordens = [], isLoading } = useOrdens(q, status);
  const mudarStatus = useAtualizarStatus();
  const excluir = useExcluirOrdem();

  const porStatus = useMemo(() => {
    const map = Object.fromEntries(STATUS_ORDEM.map((s) => [s, [] as Ordem[]])) as Record<StatusOrdem, Ordem[]>;
    for (const o of ordens) map[o.status]?.push(o);
    return map;
  }, [ordens]);

  const aplicarStatus = async (id: string, novoStatus: StatusOrdem) => {
    try {
      await mudarStatus.mutateAsync({ id, status: novoStatus });
      toast.success(`Status alterado para “${STATUS_ROTULO[novoStatus]}”.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remover = async (id: string) => {
    try {
      await excluir.mutateAsync(id);
      toast.success("Ordem excluída.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ordens de Produção</h1>
            <p className="text-sm text-muted-foreground">{ordens.length} ordens listadas</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-md border">
              <button
                type="button"
                onClick={() => setModo("grid")}
                className={cn("px-2.5 py-1.5", modo === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                aria-label="Visualizar em grade"
              >
                <Rows3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setModo("kanban")}
                className={cn("px-2.5 py-1.5", modo === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                aria-label="Visualizar em Kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            {canEdit && (
              <Button size="sm" className="gap-2" onClick={() => setNovo(true)}>
                <Plus className="h-4 w-4" /> Nova ordem
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nº, referência ou produto…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status || "todos"} onValueChange={(v) => setStatus(v === "todos" ? "" : v)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_ORDEM.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_ROTULO[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : ordens.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma ordem de produção encontrada.</p>
            {canEdit && (
              <Button className="gap-2" onClick={() => setNovo(true)}>
                <Plus className="h-4 w-4" /> Criar primeira ordem
              </Button>
            )}
          </div>
        ) : modo === "grid" ? (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-muted/80">
                <tr>
                  {["Nº", "Referência", "Produto", "Qtd.", "Materiais", "Status", "Criado por", "Data", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap p-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {ordens.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => navigate({ to: "/ordem/$id", params: { id: o.id } })}
                  >
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        {o.imagem_url && (
                          <img
                            src={o.imagem_url}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded object-cover"
                          />
                        )}
                        {o.numero}
                      </div>
                    </td>
                    <td className="p-3">{o.referencia}</td>
                    <td className="max-w-xs truncate p-3">{o.descricao}</td>
                    <td className="p-3 tabular-nums">{o.quantidade}</td>
                    <td className="p-3 tabular-nums">{o.ordem_itens?.length ?? 0}</td>
                    <td className="p-3">
                      <span className={cn("rounded-full px-2 py-1 text-xs font-medium", STATUS_CLASSE[o.status])}>
                        {STATUS_ROTULO[o.status]}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{o.criado_por_email ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(o.criado_em).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Ações
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate({ to: "/ordem/$id", params: { id: o.id } })}>
                            Abrir
                          </DropdownMenuItem>
                          {canEdit &&
                            STATUS_ORDEM.filter((s) => s !== o.status).map((s) => (
                              <DropdownMenuItem key={s} onSelect={() => aplicarStatus(o.id, s)}>
                                Marcar como {STATUS_ROTULO[s].toLowerCase()}
                              </DropdownMenuItem>
                            ))}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => remover(o.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {STATUS_ORDEM.map((s) => (
              <div
                key={s}
                onDragOver={(e) => canEdit && e.preventDefault()}
                onDrop={() => {
                  if (canEdit && arrastando) aplicarStatus(arrastando, s);
                  setArrastando(null);
                }}
                className="flex min-h-40 flex-col gap-2 rounded-xl border bg-muted/30 p-2"
              >
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {STATUS_ROTULO[s]}
                  </span>
                  <Badge variant="secondary">{porStatus[s].length}</Badge>
                </div>
                {porStatus[s].map((o) => (
                  <div
                    key={o.id}
                    draggable={canEdit}
                    onDragStart={() => setArrastando(o.id)}
                    onDragEnd={() => setArrastando(null)}
                    onClick={() => navigate({ to: "/ordem/$id", params: { id: o.id } })}
                    className="cursor-pointer overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {o.imagem_url && (
                      <img
                        src={o.imagem_url}
                        alt={`Ordem ${o.numero}`}
                        className="aspect-video w-full object-cover"
                      />
                    )}
                    <div className="p-3">
                    <div className="text-xs text-muted-foreground">{o.numero}</div>
                    <div className="truncate text-sm font-medium">{o.referencia}</div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{o.descricao}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Qtd. {o.quantidade}</span>
                      <span>{o.ordem_itens?.length ?? 0} materiais</span>
                    </div>

                    {canEdit && (
                      <div className="mt-2 md:hidden" onClick={(e) => e.stopPropagation()}>
                        <Select value={o.status} onValueChange={(v) => aplicarStatus(o.id, v as StatusOrdem)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_ORDEM.map((st) => (
                              <SelectItem key={st} value={st}>
                                {STATUS_ROTULO[st]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <NovaOrdem open={novo} onOpenChange={setNovo} onCriada={(id) => navigate({ to: "/ordem/$id", params: { id } })} />
    </AppShell>
  );
}
