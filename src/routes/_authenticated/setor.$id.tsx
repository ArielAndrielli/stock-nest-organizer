import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  useSetor,
  useVagas,
  useCaixas,
  useSaveVaga,
  useDeleteVaga,
  ocupacaoVaga,
  capacityStatus,
  statusLabel,
  type Vaga,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/setor/$id")({
  head: () => ({
    meta: [
      { title: "Setor · Estoque" },
      { name: "description", content: "Vagas cadastradas neste setor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetorDetail,
});

function SetorDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: setor, isLoading: loadingSetor } = useSetor(id);
  const { data: vagas, isLoading: loadingVagas } = useVagas(id);
  const { data: caixas } = useCaixas();
  const save = useSaveVaga();
  const del = useDeleteVaga();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vaga | null>(null);
  const [codigo, setCodigo] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Vaga | null>(null);

  const openNew = () => {
    setEditing(null);
    setCodigo("");
    setCapacidade("");
    setObservacoes("");
    setImagem(null);
    setOpen(true);
  };
  const openEdit = (v: Vaga) => {
    setEditing(v);
    setCodigo(v.codigo);
    setCapacidade(String(v.capacidade));
    setObservacoes(v.observacoes ?? "");
    setImagem(v.imagem_url);
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) {
      toast.error("Informe o código da vaga.");
      return;
    }
    const cap = Number(capacidade);
    if (!Number.isFinite(cap) || cap < 0) {
      toast.error("Capacidade inválida.");
      return;
    }
    save.mutate(
      {
        id: editing?.id,
        setor_id: id,
        codigo: codigo.trim(),
        capacidade: cap,
        observacoes: observacoes.trim() || null,
        imagem_url: imagem,
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Vaga atualizada." : "Vaga criada.");
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
      },
    );
  };

  if (loadingSetor) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!setor) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <p className="font-medium">Setor não encontrado</p>
          <Link to="/setores" className="mt-4 inline-block text-primary hover:underline">
            Voltar para setores
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link to="/setores" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Setores
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{setor.nome}</h1>
          {setor.descricao && <p className="text-sm text-muted-foreground">{setor.descricao}</p>}
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nova vaga
        </Button>
      </div>

      {loadingVagas && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      )}

      {!loadingVagas && (vagas?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center animate-fade-in">
          <p className="font-medium">Nenhuma vaga neste setor</p>
          <Button onClick={openNew} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Nova vaga
          </Button>
        </div>
      )}

      {!loadingVagas && vagas && vagas.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vagas.map((v) => {
            const oc = ocupacaoVaga(v.id, caixas ?? []);
            const st = capacityStatus(oc, v.capacidade);
            const lbl = statusLabel(st);
            return (
              <EntityCard
                key={v.id}
                cover={v.imagem_url}
                title={`Vaga ${v.codigo}`}
                subtitle={v.observacoes ?? undefined}
                onClick={() => navigate({ to: "/vaga/$id", params: { id: v.id } })}
                badges={
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${lbl.color}`}>
                    <span className={`h-2 w-2 rounded-full ${lbl.dot}`} />
                    {lbl.label}
                  </span>
                }
                footer={
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Ocupado: <b className="text-foreground">{oc}</b>
                      {v.capacidade > 0 && <> / {v.capacidade}</>}
                    </span>
                    <span>{(caixas ?? []).filter((c) => c.vaga_id === v.id).length} caixa(s)</span>
                  </div>
                }
                actions={[
                  { label: "Editar", icon: <Pencil className="mr-2 h-4 w-4" />, onSelect: () => openEdit(v) },
                  {
                    label: "Excluir",
                    icon: <Trash2 className="mr-2 h-4 w-4" />,
                    destructive: true,
                    onSelect: () => setConfirmDel(v),
                  },
                ]}
              />
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar vaga" : "Nova vaga"}</DialogTitle>
              <DialogDescription>Cada vaga armazena caixas com controle de capacidade.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cod">Código *</Label>
                  <Input id="cod" value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={40} placeholder="Ex: A-05" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cap">Capacidade (0 = sem limite)</Label>
                  <Input id="cap" type="number" min={0} value={capacidade} onChange={(e) => setCapacidade(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="obs">Observações</Label>
                <Textarea id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={500} />
              </div>
              <ImageField value={imagem} onChange={setImagem} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
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
            <AlertDialogTitle>Excluir vaga?</AlertDialogTitle>
            <AlertDialogDescription>
              A vaga <b>{confirmDel?.codigo}</b> e todas as suas caixas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDel) return;
                del.mutate(confirmDel.id, {
                  onSuccess: () => toast.success("Vaga removida."),
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
