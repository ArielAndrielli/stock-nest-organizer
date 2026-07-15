import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRightLeft, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useVaga,
  useSetor,
  useCaixas,
  useSaveCaixa,
  useDeleteCaixa,
  useMoveCaixa,
  useVagas,
  useSetores,
  ocupacaoVaga,
  capacityStatus,
  statusLabel,
  type Caixa,
} from "@/lib/queries";

export const Route = createFileRoute("/vaga/$id")({
  head: () => ({
    meta: [
      { title: "Vaga · Estoque" },
      { name: "description", content: "Gerencie as caixas armazenadas nesta vaga." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VagaDetail,
});

function VagaDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: vaga, isLoading: loadingVaga } = useVaga(id);
  const { data: setor } = useSetor(vaga?.setor_id ?? "");
  const { data: caixas, isLoading: loadingCaixas } = useCaixas(id);
  const { data: todasCaixas } = useCaixas();
  const { data: todasVagas } = useVagas();
  const { data: setores } = useSetores();
  const save = useSaveCaixa();
  const del = useDeleteCaixa();
  const move = useMoveCaixa();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Caixa | null>(null);
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [descricao, setDescricao] = useState("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Caixa | null>(null);
  const [moveOpen, setMoveOpen] = useState<Caixa | null>(null);
  const [moveDest, setMoveDest] = useState<string>("");

  const ocupado = useMemo(
    () => (caixas ?? []).reduce((s, c) => s + c.quantidade, 0),
    [caixas],
  );
  const st = vaga ? capacityStatus(ocupado, vaga.capacidade) : "sem-limite";
  const lbl = statusLabel(st);

  const openNew = () => {
    if (vaga && vaga.capacidade > 0 && ocupado >= vaga.capacidade) {
      toast.error("Vaga lotada. Não é possível adicionar mais caixas.");
      return;
    }
    setEditing(null);
    setNome("");
    setQuantidade("1");
    setDescricao("");
    setImagem(null);
    setOpen(true);
  };
  const openEdit = (c: Caixa) => {
    setEditing(c);
    setNome(c.nome);
    setQuantidade(String(c.quantidade));
    setDescricao(c.descricao ?? "");
    setImagem(c.imagem_url);
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaga) return;
    if (!nome.trim()) {
      toast.error("Informe o nome da caixa.");
      return;
    }
    const q = Number(quantidade);
    if (!Number.isFinite(q) || q < 1) {
      toast.error("Quantidade inválida.");
      return;
    }
    if (vaga.capacidade > 0) {
      const outros = editing
        ? ocupado - editing.quantidade
        : ocupado;
      if (outros + q > vaga.capacidade) {
        toast.error(
          `Capacidade excedida (${outros + q} / ${vaga.capacidade}). Reduza a quantidade.`,
        );
        return;
      }
    }
    save.mutate(
      {
        id: editing?.id,
        vaga_id: vaga.id,
        nome: nome.trim(),
        quantidade: q,
        descricao: descricao.trim() || null,
        imagem_url: imagem,
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Caixa atualizada." : "Caixa adicionada.");
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
      },
    );
  };

  const doMove = () => {
    if (!moveOpen || !moveDest) return;
    const destino = (todasVagas ?? []).find((v) => v.id === moveDest);
    if (!destino) return;
    if (destino.capacidade > 0) {
      const ocDest = ocupacaoVaga(destino.id, (todasCaixas ?? []).filter((c) => c.id !== moveOpen.id));
      if (ocDest + moveOpen.quantidade > destino.capacidade) {
        toast.error(`Vaga destino não comporta esta caixa (${ocDest + moveOpen.quantidade}/${destino.capacidade}).`);
        return;
      }
    }
    move.mutate(
      { caixa: moveOpen, vagaDestinoId: moveDest },
      {
        onSuccess: () => {
          toast.success("Caixa movida.");
          setMoveOpen(null);
          setMoveDest("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao mover."),
      },
    );
  };

  if (loadingVaga) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!vaga) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <p className="font-medium">Vaga não encontrada</p>
          <Link to="/setores" className="mt-4 inline-block text-primary hover:underline">Voltar</Link>
        </div>
      </AppShell>
    );
  }

  const vagasAgrupadas = (setores ?? []).map((s) => ({
    setor: s,
    vagas: (todasVagas ?? []).filter((v) => v.setor_id === s.id && v.id !== vaga.id),
  }));

  return (
    <AppShell>
      {setor && (
        <Link to="/setor/$id" params={{ id: setor.id }} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {setor.nome}
        </Link>
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Vaga {vaga.codigo}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${lbl.color}`}>
              <span className={`h-2 w-2 rounded-full ${lbl.dot}`} />
              {lbl.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Ocupado <b className="text-foreground">{ocupado}</b>
            {vaga.capacidade > 0 && <> / {vaga.capacidade} unidades</>} · {caixas?.length ?? 0} caixa(s)
          </p>
          {vaga.observacoes && <p className="mt-1 text-sm text-muted-foreground">{vaga.observacoes}</p>}
        </div>
        <Button onClick={openNew} className="gap-2" disabled={vaga.capacidade > 0 && ocupado >= vaga.capacidade}>
          <Plus className="h-4 w-4" /> Nova caixa
        </Button>
      </div>

      {loadingCaixas && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      )}

      {!loadingCaixas && (caixas?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center animate-fade-in">
          <p className="font-medium">Nenhuma caixa nesta vaga</p>
          <Button onClick={openNew} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Nova caixa
          </Button>
        </div>
      )}

      {!loadingCaixas && caixas && caixas.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {caixas.map((c) => (
            <EntityCard
              key={c.id}
              cover={c.imagem_url}
              title={c.nome}
              subtitle={c.descricao ?? undefined}
              badges={
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Qtd: {c.quantidade}
                </span>
              }
              actions={[
                { label: "Editar", icon: <Pencil className="mr-2 h-4 w-4" />, onSelect: () => openEdit(c) },
                {
                  label: "Mover caixa",
                  icon: <ArrowRightLeft className="mr-2 h-4 w-4" />,
                  onSelect: () => {
                    setMoveOpen(c);
                    setMoveDest("");
                  },
                },
                {
                  label: "Excluir",
                  icon: <Trash2 className="mr-2 h-4 w-4" />,
                  destructive: true,
                  onSelect: () => setConfirmDel(c),
                },
              ]}
            />
          ))}
        </div>
      )}

      {/* Form caixa */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar caixa" : "Nova caixa"}</DialogTitle>
              <DialogDescription>Adicione uma caixa a esta vaga.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qtd">Quantidade *</Label>
                  <Input id="qtd" type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Descrição</Label>
                <Textarea id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={500} />
              </div>
              <ImageField value={imagem} onChange={setImagem} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : editing ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mover caixa */}
      <Dialog open={!!moveOpen} onOpenChange={(o) => !o && setMoveOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover caixa</DialogTitle>
            <DialogDescription>
              Selecione a vaga de destino para <b>{moveOpen?.nome}</b>. A caixa e seus dados serão preservados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={moveDest} onValueChange={setMoveDest}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a vaga de destino" />
              </SelectTrigger>
              <SelectContent>
                {vagasAgrupadas.filter((g) => g.vagas.length > 0).map((g) => (
                  <SelectGroup key={g.setor.id}>
                    <SelectLabel>{g.setor.nome}</SelectLabel>
                    {g.vagas.map((v) => {
                      const oc = ocupacaoVaga(v.id, todasCaixas ?? []);
                      const lot = v.capacidade > 0 && oc >= v.capacidade;
                      return (
                        <SelectItem key={v.id} value={v.id} disabled={lot}>
                          Vaga {v.codigo} — {oc}{v.capacidade > 0 ? `/${v.capacidade}` : ""}
                          {lot ? " (lotada)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(null)}>Cancelar</Button>
            <Button onClick={doMove} disabled={!moveDest || move.isPending}>
              {move.isPending ? "Movendo…" : "Mover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caixa?</AlertDialogTitle>
            <AlertDialogDescription>
              A caixa <b>{confirmDel?.nome}</b> será removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDel) return;
                del.mutate(confirmDel.id, {
                  onSuccess: () => toast.success("Caixa removida."),
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
      {/* referenciar navigate para evitar unused */}
      <span className="hidden">{String(!!navigate)}</span>
    </AppShell>
  );
}
