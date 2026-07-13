import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Boxes, Package, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useVagas } from "@/lib/vagas-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestão de Vagas de Estoque" },
      {
        name: "description",
        content:
          "Cadastre vagas de estoque e gerencie os sub-itens armazenados em cada posição do seu armazém.",
      },
      { property: "og:title", content: "Gestão de Vagas de Estoque" },
      {
        property: "og:description",
        content: "Cadastre vagas de estoque e gerencie os sub-itens de cada posição.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { vagas, hydrated, addVaga, removeVaga } = useVagas();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [setor, setSetor] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [query, setQuery] = useState("");

  const reset = () => {
    setCodigo("");
    setSetor("");
    setCapacidade("");
    setObservacoes("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !setor.trim()) {
      toast.error("Preencha o código e o setor.");
      return;
    }
    const cap = Number(capacidade);
    if (!Number.isFinite(cap) || cap < 0) {
      toast.error("Capacidade inválida.");
      return;
    }
    addVaga({
      codigo: codigo.trim(),
      setor: setor.trim(),
      capacidade: cap,
      observacoes: observacoes.trim() || undefined,
    });
    toast.success(`Vaga ${codigo} cadastrada.`);
    reset();
    setOpen(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vagas;
    return vagas.filter(
      (v) =>
        v.codigo.toLowerCase().includes(q) ||
        v.setor.toLowerCase().includes(q),
    );
  }, [vagas, query]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Vagas de Estoque</h1>
              <p className="text-xs text-muted-foreground">
                Cadastre posições e gerencie os itens armazenados
              </p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nova vaga
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={submit}>
                <DialogHeader>
                  <DialogTitle>Cadastrar nova vaga</DialogTitle>
                  <DialogDescription>
                    Defina o código, setor e capacidade da posição de estoque.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="codigo">Código *</Label>
                      <Input
                        id="codigo"
                        placeholder="Ex: A-01-03"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        maxLength={40}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="setor">Setor *</Label>
                      <Input
                        id="setor"
                        placeholder="Ex: Corredor A"
                        value={setor}
                        onChange={(e) => setSetor(e.target.value)}
                        maxLength={60}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="capacidade">Capacidade (unidades)</Label>
                    <Input
                      id="capacidade"
                      type="number"
                      min={0}
                      placeholder="Ex: 100"
                      value={capacidade}
                      onChange={(e) => setCapacidade(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="obs">Observações</Label>
                    <Textarea
                      id="obs"
                      placeholder="Notas sobre a vaga"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Vagas cadastradas</h2>
            <p className="text-sm text-muted-foreground">
              {vagas.length} {vagas.length === 1 ? "vaga" : "vagas"} no total
              {query && ` · ${filtered.length} encontradas`}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou setor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {hydrated && vagas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Nenhuma vaga cadastrada</p>
                <p className="text-sm text-muted-foreground">
                  Comece criando a primeira posição do seu estoque.
                </p>
              </div>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Cadastrar vaga
              </Button>
            </CardContent>
          </Card>
        ) : hydrated && filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Search className="h-6 w-6 text-muted-foreground" />
              <p className="font-medium">Nenhuma vaga encontrada</p>
              <p className="text-sm text-muted-foreground">
                Tente outro código ou setor.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => {
              const total = v.subItens.reduce((s, i) => s + i.quantidade, 0);
              return (
                <Card
                  key={v.id}
                  className="flex cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  onClick={() => navigate({ to: "/vaga/$id", params: { id: v.id } })}
                >
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted transition-colors duration-300 hover:bg-muted/80">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{v.codigo}</CardTitle>
                        <CardDescription>{v.setor}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {v.subItens.length} {v.subItens.length === 1 ? "item" : "itens"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Capacidade</p>
                        <p className="font-medium">{v.capacidade || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ocupado</p>
                        <p className="font-medium">{total}</p>
                      </div>
                    </div>
                    {v.observacoes && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {v.observacoes}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-end">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remover a vaga ${v.codigo}?`)) {
                            removeVaga(v.id);
                            toast.success("Vaga removida.");
                          }
                        }}
                        aria-label="Remover vaga"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
