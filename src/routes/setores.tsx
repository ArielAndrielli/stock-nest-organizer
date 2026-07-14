import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EntityCard } from "@/components/EntityCard";
import { ImageField } from "@/components/ImageField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useSetores, useSaveSetor, useDeleteSetor, type Setor } from "@/lib/queries";

export const Route = createFileRoute("/setores")({
  head: () => ({
    meta: [
      { title: "Setores · Estoque" },
      { name: "description", content: "Cadastre e gerencie os setores do seu armazém." },
    ],
  }),
  component: SetoresPage,
});

function SetoresPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useSetores();
  const save = useSaveSetor();
  const del = useDeleteSetor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Setor | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Setor | null>(null);

  const openNew = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setImagem(null);
    setOpen(true);
  };
  const openEdit = (s: Setor) => {
    setEditing(s);
    setNome(s.nome);
    setDescricao(s.descricao ?? "");
    setImagem(s.imagem_url);
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do setor.");
      return;
    }
    save.mutate(
      {
        id: editing?.id,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        imagem_url: imagem,
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Setor atualizado." : "Setor criado.");
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
      },
    );
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Setores</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} setor${data.length === 1 ? "" : "es"} cadastrado${data.length === 1 ? "" : "s"}` : "Carregando…"}
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo setor
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center animate-fade-in">
          <p className="font-medium">Nenhum setor cadastrado</p>
          <p className="text-sm text-muted-foreground">Crie o primeiro setor para começar.</p>
          <Button onClick={openNew} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Novo setor
          </Button>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <EntityCard
              key={s.id}
              cover={s.imagem_url}
              title={s.nome}
              subtitle={s.descricao ?? undefined}
              onClick={() => navigate({ to: "/setor/$id", params: { id: s.id } })}
              actions={[
                {
                  label: "Editar",
                  icon: <Pencil className="mr-2 h-4 w-4" />,
                  onSelect: () => openEdit(s),
                },
                {
                  label: "Excluir",
                  icon: <Trash2 className="mr-2 h-4 w-4" />,
                  destructive: true,
                  onSelect: () => setConfirmDel(s),
                },
              ]}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar setor" : "Novo setor"}</DialogTitle>
              <DialogDescription>
                Setores organizam as vagas do seu estoque.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Descrição</Label>
                <Textarea id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={500} />
              </div>
              <ImageField value={imagem} onChange={setImagem} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir setor?</AlertDialogTitle>
            <AlertDialogDescription>
              O setor <b>{confirmDel?.nome}</b> e todas as vagas e caixas dentro dele serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDel) return;
                const id = confirmDel.id;
                del.mutate(id, {
                  onSuccess: () => toast.success("Setor removido."),
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover."),
                });
                setConfirmDel(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
