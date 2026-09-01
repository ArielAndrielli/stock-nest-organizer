import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, List, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompromissoDialog } from "@/components/calendario/CompromissoDialog";
import { usePermissions } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CATEGORIAS, CATEGORIA_CLASSE, CATEGORIA_PONTO, CATEGORIA_ROTULO,
  categoriaValida, chaveDia, dataLonga, fimDoMes, horaCurta, inicioDoMes, mesmoDia,
  semanasDoMes, useCompromissos, useExcluirCompromisso, type Compromisso,
} from "@/lib/compromissos";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário · Estoque" },
      { name: "description", content: "Agende e acompanhe compromissos da equipe em um calendário mensal." },
      { property: "og:title", content: "Calendário de compromissos" },
      { property: "og:description", content: "Agende e acompanhe compromissos da equipe em um calendário mensal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarioPage,
});

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function CalendarioPage() {
  const hoje = new Date();
  const [ref, setRef] = useState(() => inicioDoMes(hoje));
  const [visao, setVisao] = useState<"mes" | "lista">("mes");
  const [filtro, setFiltro] = useState("todas");
  const [diaAberto, setDiaAberto] = useState<Date | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Compromisso | null>(null);
  const [excluir, setExcluir] = useState<Compromisso | null>(null);

  const { canEdit, canDelete } = usePermissions();
  const excluirMut = useExcluirCompromisso();
  const { data, isLoading } = useCompromissos(inicioDoMes(ref), fimDoMes(ref));

  const eventos = useMemo(
    () => (data ?? []).filter((c) => filtro === "todas" || c.categoria === filtro),
    [data, filtro],
  );

  const porDia = useMemo(() => {
    const m = new Map<string, Compromisso[]>();
    for (const c of eventos) {
      const k = chaveDia(new Date(c.inicio));
      const arr = m.get(k) ?? [];
      arr.push(c);
      m.set(k, arr);
    }
    return m;
  }, [eventos]);

  const semanas = useMemo(() => semanasDoMes(ref), [ref]);
  const tituloMes = ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const abrirNovo = (d?: Date | null) => {
    setEditando(null);
    setDiaAberto(d ?? diaAberto);
    setDialogAberto(true);
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    try {
      await excluirMut.mutateAsync(excluir.id);
      toast.success("Compromisso excluído.");
    } catch (e) {
      toast.error((e as Error).message ?? "Não foi possível excluir.");
    }
    setExcluir(null);
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendário</h1>
          <p className="text-sm text-muted-foreground">Agende e acompanhe os compromissos da equipe.</p>
        </div>
        {canEdit && (
          <Button onClick={() => abrirNovo(new Date())} className="gap-2">
            <Plus className="h-4 w-4" /> Novo compromisso
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Mês anterior"
            onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Próximo mês"
            onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRef(inicioDoMes(new Date()))}>Hoje</Button>
        </div>
        <div className="text-lg font-semibold capitalize">{tituloMes}</div>
        <div className="flex-1" />
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{CATEGORIA_ROTULO[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border p-0.5">
          <Button variant={visao === "mes" ? "secondary" : "ghost"} size="sm" className="gap-1.5" onClick={() => setVisao("mes")}>
            <CalendarDays className="h-4 w-4" /> Mês
          </Button>
          <Button variant={visao === "lista" ? "secondary" : "ghost"} size="sm" className="gap-1.5" onClick={() => setVisao("lista")}>
            <List className="h-4 w-4" /> Lista
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[520px] rounded-xl" />
      ) : visao === "mes" ? (
        <Card className="overflow-hidden animate-fade-in">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {DIAS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {semanas.flat().map((d, i) => {
              const doMes = d.getMonth() === ref.getMonth();
              const lista = porDia.get(chaveDia(d)) ?? [];
              const ehHoje = mesmoDia(d, new Date());
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDiaAberto(d)}
                  className={cn(
                    "min-h-24 border-b border-r p-1.5 text-left align-top transition-colors hover:bg-accent/60",
                    !doMes && "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <div className={cn(
                    "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    ehHoje && "bg-primary text-primary-foreground",
                  )}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-1">
                    {lista.slice(0, 3).map((c) => (
                      <div key={c.id}
                        className={cn("truncate rounded border px-1.5 py-0.5 text-[11px]", CATEGORIA_CLASSE[categoriaValida(c.categoria)])}>
                        {!c.dia_inteiro && <span className="mr-1 font-medium">{horaCurta(c.inicio)}</span>}
                        {c.titulo}
                      </div>
                    ))}
                    {lista.length > 3 && (
                      <div className="px-1 text-[11px] text-muted-foreground">+{lista.length - 3} mais</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="space-y-2 animate-fade-in">
          {eventos.length === 0 && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum compromisso neste mês.</CardContent></Card>
          )}
          {eventos.map((c) => (
            <Card key={c.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", CATEGORIA_PONTO[categoriaValida(c.categoria)])} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.titulo}</div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {dataLonga(c.inicio)}{!c.dia_inteiro && ` · ${horaCurta(c.inicio)}`}
                    </span>
                    {c.local && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.local}</span>}
                    <span>{CATEGORIA_ROTULO[categoriaValida(c.categoria)]}</span>
                  </div>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => { setEditando(c); setDialogAberto(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" aria-label="Excluir" className="text-destructive" onClick={() => setExcluir(c)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!diaAberto && !dialogAberto} onOpenChange={(v) => !v && setDiaAberto(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="capitalize">
              {diaAberto?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {canEdit && (
              <Button className="w-full gap-2" onClick={() => abrirNovo(diaAberto)}>
                <Plus className="h-4 w-4" /> Novo compromisso
              </Button>
            )}
            {(porDia.get(diaAberto ? chaveDia(diaAberto) : "") ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
            )}
            {(porDia.get(diaAberto ? chaveDia(diaAberto) : "") ?? []).map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", CATEGORIA_PONTO[categoriaValida(c.categoria)])} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{c.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.dia_inteiro ? "Dia inteiro" : `${horaCurta(c.inicio)}${c.fim ? ` – ${horaCurta(c.fim)}` : ""}`}
                      {" · "}{CATEGORIA_ROTULO[categoriaValida(c.categoria)]}
                    </div>
                    {c.local && <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{c.local}</div>}
                    {c.descricao && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{c.descricao}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => { setEditando(c); setDialogAberto(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" aria-label="Excluir" className="text-destructive" onClick={() => setExcluir(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <CompromissoDialog
        open={dialogAberto}
        onOpenChange={(v) => { setDialogAberto(v); if (!v) setEditando(null); }}
        compromisso={editando}
        dataInicial={diaAberto}
      />

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
            <AlertDialogDescription>
              “{excluir?.titulo}” será removido permanentemente da agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
