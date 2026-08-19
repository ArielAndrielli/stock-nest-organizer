import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  ImageIcon,
  LayoutGrid,
  MoreVertical,
  Package,
  RefreshCw,
  Rows3,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-auth";
import { ColunasSheet } from "@/components/itens/ColunasSheet";
import { FiltrosSheet } from "@/components/itens/FiltrosSheet";
import { ItemDetalhes } from "@/components/itens/ItemDetalhes";
import { ImportarExcel } from "@/components/itens/ImportarExcel";
import { ExportarDialog } from "@/components/itens/ExportarDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COLUNAS_PADRAO,
  OPCOES_POR_PAGINA,
  PREFS_PADRAO,
  formatarValor,
  useDeleteItem,
  useItemCampos,
  useItens,
  usePrefs,
  useSavePrefs,
  useTotalItens,
  valorCampo,
  type Item,
  type Prefs,
} from "@/lib/itens";

export const Route = createFileRoute("/_authenticated/itens")({
  head: () => ({
    meta: [
      { title: "Cadastro de Itens · Estoque" },
      {
        name: "description",
        content: "Gerencie produtos, cartões, embalagens e matérias-primas com busca, filtros e importação de Excel.",
      },
      { property: "og:title", content: "Cadastro de Itens · Estoque" },
      {
        property: "og:description",
        content: "Base centralizada de itens com pesquisa, filtros dinâmicos e importação via planilha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ItensPage,
});

const POR_PAGINA = 25;

function ItensPage() {
  const { canEdit, canDelete } = usePermissions();
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [ordenarPor, setOrdenarPor] = useState("codigo_interno");
  const [ordem, setOrdem] = useState<"asc" | "desc">("asc");
  const [pagina, setPagina] = useState(1);
  const [openColunas, setOpenColunas] = useState(false);
  const [openFiltros, setOpenFiltros] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [detalhe, setDetalhe] = useState<Item | null>(null);
  const [excluir, setExcluir] = useState<Item | null>(null);

  const { data: campos = [], isLoading: loadingCampos } = useItemCampos();
  const { data: prefs } = usePrefs();
  const savePrefs = useSavePrefs();
  const { data: total } = useTotalItens();
  const del = useDeleteItem();

  const modo = prefs?.modo_visualizacao ?? "grid";
  const visiveis = prefs?.colunas_visiveis?.length ? prefs.colunas_visiveis : COLUNAS_PADRAO;

  const colunas = useMemo(
    () => campos.filter((c) => visiveis.includes(c.chave)),
    [campos, visiveis],
  );

  const { data, isLoading, isFetching, isError, refetch } = useItens({
    q: busca,
    filtros,
    ordenarPor,
    ordem,
    pagina,
    porPagina: POR_PAGINA,
  });

  const rows = data?.rows ?? [];
  const totalFiltrado = data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(totalFiltrado / POR_PAGINA));
  const filtrosAtivos = Object.values(filtros).filter(Boolean).length;

  const aplicarBusca = (valor: string) => {
    setBusca(valor);
    setPagina(1);
  };

  const alternarOrdem = (chave: string) => {
    if (ordenarPor === chave) setOrdem((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setOrdenarPor(chave);
      setOrdem("asc");
    }
    setPagina(1);
  };

  const exportar = (todosCampos: boolean) => {
    const cols = todosCampos ? campos : colunas;
    const dados = rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const c of cols) o[c.rotulo] = formatarValor(valorCampo(r, c.chave));
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Itens");
    XLSX.writeFile(wb, "itens.xlsx");
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    try {
      await del.mutateAsync(excluir.id);
      toast.success("Item excluído.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExcluir(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cadastro de Itens</h1>
            <p className="text-sm text-muted-foreground">
              {total !== undefined ? `${total.toLocaleString("pt-BR")} itens cadastrados` : "Carregando base…"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpenFiltros(true)}>
              <Filter className="h-4 w-4" /> Filtros
              {filtrosAtivos > 0 && <Badge variant="secondary">{filtrosAtivos}</Badge>}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpenColunas(true)}>
              <SlidersHorizontal className="h-4 w-4" /> Colunas
            </Button>
            <div className="flex overflow-hidden rounded-md border">
              <button
                type="button"
                onClick={() => savePrefs.mutate({ modo_visualizacao: "grid" })}
                className={cn("px-2.5 py-1.5 transition-colors", modo === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                aria-label="Visualizar em grade"
              >
                <Rows3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => savePrefs.mutate({ modo_visualizacao: "cards" })}
                className={cn("px-2.5 py-1.5 transition-colors", modo === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                aria-label="Visualizar em cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => exportar(false)}>Colunas visíveis</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportar(true)}>Todos os campos</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canEdit && (
              <Button size="sm" className="gap-2" onClick={() => setOpenImport(true)}>
                <Upload className="h-4 w-4" /> Importar Excel
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && aplicarBusca(q)}
              onBlur={() => aplicarBusca(q)}
              placeholder="Pesquisar por código, referência, descrição, marca ou setor…"
              className="pl-9"
            />
          </div>
          {(busca || filtrosAtivos > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => {
                setQ("");
                setBusca("");
                setFiltros({});
                setPagina(1);
              }}
            >
              <X className="h-4 w-4" /> Limpar
            </Button>
          )}
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">Não foi possível carregar os itens.</p>
            <Button variant="outline" className="gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        ) : isLoading || loadingCampos ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            {total === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">Nenhum item cadastrado ainda.</p>
                {canEdit && (
                  <Button className="gap-2" onClick={() => setOpenImport(true)}>
                    <Upload className="h-4 w-4" /> Importar Excel
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum item encontrado com os critérios atuais.</p>
            )}
          </div>
        ) : modo === "grid" ? (
          <div className={cn("overflow-x-auto rounded-xl border bg-card", isFetching && "opacity-70")}>
            <table className="w-full min-w-max text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr>
                  {colunas.map((c) => (
                    <th key={c.chave} className="whitespace-nowrap p-3 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-primary"
                        onClick={() => alternarOrdem(c.chave)}
                      >
                        {c.rotulo}
                        {ordenarPor === c.chave &&
                          (ordem === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                  ))}
                  <th className="w-12 p-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setDetalhe(item)}
                  >
                    {colunas.map((c) => (
                      <td key={c.chave} className="max-w-xs truncate p-3">
                        {c.chave === "imagem_url" && item.imagem_url ? (
                          <img src={item.imagem_url} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          formatarValor(valorCampo(item, c.chave))
                        )}
                      </td>
                    ))}
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setDetalhe(item)}>Visualizar</DropdownMenuItem>
                          {canEdit && <DropdownMenuItem onSelect={() => setDetalhe(item)}>Editar</DropdownMenuItem>}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setExcluir(item)}
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
          <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", isFetching && "opacity-70")}>
            {rows.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDetalhe(item)}
                className="group overflow-hidden rounded-xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  {item.imagem_url ? (
                    <img
                      src={item.imagem_url}
                      alt={item.referencia ?? "Item"}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-7 w-7" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <div className="text-xs text-muted-foreground">#{item.codigo_interno}</div>
                  <div className="truncate font-medium">{item.referencia || "Sem referência"}</div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.descricao || "Sem descrição"}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Página {pagina} de {paginas} · {totalFiltrado.toLocaleString("pt-BR")} resultados
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ColunasSheet
        open={openColunas}
        onOpenChange={setOpenColunas}
        campos={campos}
        visiveis={visiveis}
        onChange={(next) => savePrefs.mutate({ colunas_visiveis: next })}
      />
      <FiltrosSheet
        open={openFiltros}
        onOpenChange={setOpenFiltros}
        campos={campos}
        filtros={filtros}
        onChange={(f) => {
          setFiltros(f);
          setPagina(1);
        }}
      />
      <ItemDetalhes item={detalhe} campos={campos} onOpenChange={(v) => !v && setDetalhe(null)} />
      <ImportarExcel
        open={openImport}
        onOpenChange={setOpenImport}
        campos={campos}
        onConcluir={() => refetch()}
      />

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              O item {excluir?.referencia || excluir?.codigo_interno} será removido permanentemente.
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
