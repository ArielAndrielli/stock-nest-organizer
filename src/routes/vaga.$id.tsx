import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useVaga } from "@/lib/vagas-store";

export const Route = createFileRoute("/vaga/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da vaga" },
      { name: "description", content: "Gerencie os sub-itens armazenados nesta vaga." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VagaDetail,
});

function VagaDetail() {
  const { id } = Route.useParams();
  const { vaga, hydrated, addSubItem, removeSubItem, removeVaga } = useVaga(id);
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [descricao, setDescricao] = useState("");

  if (hydrated && !vaga) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-medium">Vaga não encontrada.</p>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>
    );
  }

  if (!vaga) return null;

  const total = vaga.subItens.reduce((s, i) => s + i.quantidade, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do item.");
      return;
    }
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      toast.error("Quantidade inválida.");
      return;
    }
    addSubItem(vaga.id, {
      nome: nome.trim(),
      quantidade: qtd,
      descricao: descricao.trim() || undefined,
    });
    toast.success("Item adicionado.");
    setNome("");
    setQuantidade("");
    setDescricao("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold leading-tight">Vaga {vaga.codigo}</h1>
                <Badge variant="secondary">{vaga.setor}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {vaga.subItens.length} {vaga.subItens.length === 1 ? "item" : "itens"} · {total}{" "}
                unid. ocupadas
                {vaga.capacidade ? ` / ${vaga.capacidade}` : ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm(`Remover a vaga ${vaga.codigo} e todos os itens?`)) {
                removeVaga(vaga.id);
                navigate({ to: "/" });
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Excluir vaga
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adicionar sub-item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome do item *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Parafuso M6"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qtd">Quantidade *</Label>
                <Input
                  id="qtd"
                  type="number"
                  min={1}
                  placeholder="Ex: 20"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Descrição</Label>
                <Textarea
                  id="desc"
                  placeholder="Informações adicionais"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  maxLength={300}
                />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Adicionar item
              </Button>
            </form>
            {vaga.observacoes && (
              <div className="mt-6 rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">Observações da vaga</p>
                <p className="mt-1 text-sm">{vaga.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens armazenados</CardTitle>
          </CardHeader>
          <CardContent>
            {vaga.subItens.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhum item cadastrado nesta vaga ainda.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-24 text-right">Qtd</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vaga.subItens.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.nome}</div>
                        {s.descricao && (
                          <div className="text-xs text-muted-foreground">{s.descricao}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{s.quantidade}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            removeSubItem(vaga.id, s.id);
                            toast.success("Item removido.");
                          }}
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
