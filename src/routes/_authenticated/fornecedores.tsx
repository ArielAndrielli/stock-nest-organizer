import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  Upload,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { usePermissions } from "@/hooks/use-auth";
import { FornecedorDialog } from "@/components/fornecedores/FornecedorDialog";
import { ImportarFornecedores } from "@/components/fornecedores/ImportarFornecedores";
import {
  formatarCnpj,
  useExcluirFornecedor,
  useFornecedorCampos,
  useFornecedores,
  useTotalFornecedores,
  type Fornecedor,
} from "@/lib/fornecedores";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores · Estoque" },
      {
        name: "description",
        content: "Cadastre e gerencie fornecedores com busca, importação de planilhas e campos personalizados.",
      },
      { property: "og:title", content: "Fornecedores · Estoque" },
      {
        property: "og:description",
        content: "Base de fornecedores com pesquisa, paginação e importação via planilha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FornecedoresPage,
});

const POR_PAGINA = 25;

function FornecedoresPage() {
  const { canEdit, canDelete } = usePermissions();
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [openForm, setOpenForm] = useState(false);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [openImport, setOpenImport] = useState(false);
  const [excluir, setExcluir] = useState<Fornecedor | null>(null);

  const { data: campos = [] } = useFornecedorCampos();
  const { data: total } = useTotalFornecedores();
  const del = useExcluirFornecedor();
  const { data, isLoading, refetch } = useFornecedores({
    q: busca,
    ordenarPor: "nome",
    ordem: "asc",
    pagina,
    porPagina: POR_PAGINA,
  });

  const rows = data?.rows ?? [];
  const paginas = Math.max(1, Math.ceil((data?.total ?? 0) / POR_PAGINA));

  const aplicarBusca = (valor: string) => {
    setBusca(valor);
    setPagina(1);
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    try {
      await del.mutateAsync(excluir.id);
      toast.success("Fornecedor excluído.");
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
            <h1 className="text-2xl font-semibold tracking-tight">Fornecedores</h1>
            <p className="text-sm text-muted-foreground">
              {total !== undefined ? `${total.toLocaleString("pt-BR")} fornecedores cadastrados` : "Carregando base…"}
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpenImport(true)}>
                <Upload className="h-4 w-4" /> Importar planilha
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditando(null);
                  setOpenForm(true);
                }}
              >
                <Plus className="h-4 w-4" /> Novo fornecedor
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && aplicarBusca(q)}
              onBlur={() => aplicarBusca(q)}
              placeholder="Pesquisar por nome, CNPJ, e-mail, telefone ou cidade…"
              className="pl-9"
            />
          </div>
          {busca && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => {
                setQ("");
                setBusca("");
                setPagina(1);
              }}
            >
              <X className="h-4 w-4" /> Limpar
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <Truck className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhum fornecedor encontrado</p>
              <p className="text-sm text-muted-foreground">Cadastre manualmente ou importe uma planilha.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Razão Social</th>
                  <th className="px-3 py-2 font-medium">Nome Fantasia</th>
                  <th className="px-3 py-2 font-medium">CNPJ</th>
                  <th className="px-3 py-2 font-medium">Inscrição Estadual</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Telefone</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id} className="border-t transition-colors hover:bg-muted/40">
                    <td className="px-3 py-2 tabular-nums">{f.codigo ?? "—"}</td>
                    <td className="px-3 py-2 font-medium">{f.razao_social || f.nome}</td>
                    <td className="px-3 py-2">{f.nome_fantasia || "—"}</td>
                    <td className="px-3 py-2">{f.cnpj ? formatarCnpj(f.cnpj) : "—"}</td>
                    <td className="px-3 py-2">{f.inscricao_estadual || "—"}</td>
                    <td className="px-3 py-2">{f.uf || "—"}</td>
                    <td className="px-3 py-2">{f.telefone || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditando(f);
                                setOpenForm(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem className="text-destructive" onClick={() => setExcluir(f)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          )}
                          {!canEdit && !canDelete && (
                            <DropdownMenuItem disabled>Somente leitura</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Página {pagina} de {paginas}
            </p>
            <div className="flex items-center gap-2">
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

      <FornecedorDialog
        open={openForm}
        onOpenChange={(v) => {
          setOpenForm(v);
          if (!v) setEditando(null);
        }}
        fornecedor={editando}
        campos={campos}
      />
      <ImportarFornecedores
        open={openImport}
        onOpenChange={setOpenImport}
        campos={campos}
        onConcluir={() => refetch()}
      />

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              O fornecedor {excluir?.nome} será removido permanentemente.
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
