import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Boxes, Package, Plus, Trash2, ArrowRight } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [setor, setSetor] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [observacoes, setObservacoes] = useState("");

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
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vagas.map((v) => {
              const total = v.subItens.reduce((s, i) => s + i.quantidade, 0);
              return (
                <Card key={v.id} className="flex flex-col">
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
                    <div className="mt-auto flex items-center gap-2">
                      <Button asChild size="sm" className="flex-1">
                        <Link to="/vaga/$id" params={{ id: v.id }}>
                          Abrir <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
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
