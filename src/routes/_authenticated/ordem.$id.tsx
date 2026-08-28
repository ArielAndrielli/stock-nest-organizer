import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Plus, Save, Search, Trash2, User } from "lucide-react";
import { toast } from "sonner";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-auth";
import { useItens } from "@/lib/itens";
import { ImageField } from "@/components/ImageField";
import { ImageViewer } from "@/components/ImageViewer";
import {
  STATUS_CLASSE,
  STATUS_ORDEM,
  STATUS_ROTULO,
  TIPOS_MATERIAL,
  TIPO_MATERIAL_ROTULO,
  useAtualizarMateriais,
  useAtualizarOrdem,
  useAtualizarStatus,
  useExcluirOrdem,
  useOrdem,
  type NovoMaterial,
  type StatusOrdem,
} from "@/lib/ordens";

export const Route = createFileRoute("/_authenticated/ordem/$id")({
  head: () => ({
    meta: [
      { title: "Ordem de produção · Estoque" },
      {
        name: "description",
        content: "Detalhes da ordem de produção: status, materiais separados e histórico de criação.",
      },
      { property: "og:title", content: "Ordem de produção · Estoque" },
      {
        property: "og:description",
        content: "Acompanhe o status e os materiais de uma ordem de produção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdemDetalhePage,
});

function formatarData(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function OrdemDetalhePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePermissions();
  const { data: ordem, isLoading } = useOrdem(id);
  const mudarStatus = useAtualizarStatus();
  const salvarMateriais = useAtualizarMateriais();
  const excluir = useExcluirOrdem();
  const atualizarOrdem = useAtualizarOrdem();

  const [materiais, setMateriais] = useState<NovoMaterial[]>([]);
  const [sujo, setSujo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [editandoImagem, setEditandoImagem] = useState(false);
  const [imagem, setImagem] = useState<string | null>(null);

  const [tipo, setTipo] = useState<string>("cartao");
  const [buscaItem, setBuscaItem] = useState("");
  const [termo, setTermo] = useState("");
  const [qtdMaterial, setQtdMaterial] = useState("1");
  const [selecionado, setSelecionado] = useState<{ id: string; ref: string; desc: string } | null>(null);

  useEffect(() => {
    if (!ordem) return;
    setMateriais(
      (ordem.ordem_itens ?? []).map((m) => ({
        item_id: m.item_id,
        tipo_material: m.tipo_material,
        referencia: m.referencia,
        descricao: m.descricao,
        quantidade: Number(m.quantidade),
      })),
    );
    setSujo(false);
    setImagem(ordem.imagem_url ?? null);
    setEditandoImagem(false);
  }, [ordem]);

  const salvarImagem = async (valor: string | null) => {
    setImagem(valor);
    try {
      await atualizarOrdem.mutateAsync({ id, patch: { imagem_url: valor } });
      toast.success("Imagem atualizada.");
      setEditandoImagem(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setTermo(buscaItem), 250);
    return () => clearTimeout(t);
  }, [buscaItem]);

  const { data: busca, isFetching } = useItens({
    q: termo,
    filtros: {},
    ordenarPor: "codigo_interno",
    ordem: "asc",
    pagina: 1,
    porPagina: 8,
  });
  const resultados = useMemo(() => (termo.trim() ? (busca?.rows ?? []) : []), [busca, termo]);

  const adicionarMaterial = () => {
    if (!selecionado) return toast.error("Selecione um item da base.");
    const q = Number(qtdMaterial.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) return toast.error("Informe uma quantidade válida.");
    setMateriais((m) => [
      ...m,
      { item_id: selecionado.id, tipo_material: tipo, referencia: selecionado.ref, descricao: selecionado.desc, quantidade: q },
    ]);
    setSujo(true);
    setSelecionado(null);
    setBuscaItem("");
    setTermo("");
    setQtdMaterial("1");
  };

  const gravarMateriais = async () => {
    try {
      await salvarMateriais.mutateAsync({ ordemId: id, materiais });
      toast.success("Materiais atualizados.");
      setSujo(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const trocarStatus = async (status: StatusOrdem) => {
    try {
      await mudarStatus.mutateAsync({ id, status });
      toast.success(`Status alterado para “${STATUS_ROTULO[status]}”.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmarExclusao = async () => {
    try {
      await excluir.mutateAsync(id);
      toast.success("Ordem excluída.");
      navigate({ to: "/ordens" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmar(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!ordem) {
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">Ordem de produção não encontrada.</p>
          <Button variant="outline" asChild>
            <Link to="/ordens">Voltar para ordens</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="-ml-2 gap-2" asChild>
              <Link to="/ordens">
                <ArrowLeft className="h-4 w-4" /> Ordens de produção
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">{ordem.numero}</h1>
            <p className="text-sm text-muted-foreground">
              {ordem.referencia} · {ordem.descricao}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", STATUS_CLASSE[ordem.status])}>
              {STATUS_ROTULO[ordem.status]}
            </span>
            {canDelete && (
              <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => setConfirmar(true)}>
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info titulo="Quantidade" valor={String(ordem.quantidade)} />
          <Info titulo="Criado por" valor={ordem.criado_por_email ?? "—"} icone={<User className="h-4 w-4" />} />
          <Info titulo="Criado em" valor={formatarData(ordem.criado_em)} icone={<CalendarDays className="h-4 w-4" />} />
          <Info titulo="Atualizado em" valor={formatarData(ordem.atualizado_em)} />
        </div>

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Imagem</h2>
            {canEdit && !editandoImagem && (
              <Button size="sm" variant="outline" onClick={() => setEditandoImagem(true)}>
                {imagem ? "Alterar imagem" : "Adicionar imagem"}
              </Button>
            )}
            {canEdit && editandoImagem && (
              <Button size="sm" variant="ghost" onClick={() => { setImagem(ordem.imagem_url ?? null); setEditandoImagem(false); }}>
                Cancelar
              </Button>
            )}
          </div>
          {editandoImagem ? (
            <ImageField value={imagem} onChange={salvarImagem} label="Imagem da ordem" />
          ) : imagem ? (
            <button type="button" onClick={() => setZoom(imagem)} className="block w-full max-w-md overflow-hidden rounded-lg border">
              <img src={imagem} alt={`Ordem ${ordem.numero}`} className="aspect-video w-full object-cover" />
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma imagem anexada.</p>
          )}
        </section>

        {ordem.observacoes && (
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observações</div>
            <p className="whitespace-pre-wrap text-sm">{ordem.observacoes}</p>
          </div>
        )}

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Status</h2>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDEM.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === ordem.status ? "default" : "outline"}
                  disabled={mudarStatus.isPending || s === ordem.status}
                  onClick={() => trocarStatus(s)}
                  className={s === "cancelado" && s !== ordem.status ? "text-destructive" : undefined}
                >
                  {STATUS_ROTULO[s]}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Você tem permissão apenas de visualização.</p>
          )}
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Materiais</h2>
            {canEdit && sujo && (
              <Button size="sm" className="gap-2" onClick={gravarMateriais} disabled={salvarMateriais.isPending}>
                <Save className="h-4 w-4" /> {salvarMateriais.isPending ? "Salvando…" : "Salvar materiais"}
              </Button>
            )}
          </div>

          {canEdit && (
            <>
              <div className="grid gap-2 sm:grid-cols-[150px_1fr_100px_auto]">
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_MATERIAL.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_MATERIAL_ROTULO[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar item cadastrado…"
                    value={selecionado ? `${selecionado.ref} — ${selecionado.desc}` : buscaItem}
                    onChange={(e) => {
                      setSelecionado(null);
                      setBuscaItem(e.target.value);
                    }}
                  />
                </div>
                <Input
                  type="number"
                  min={1}
                  value={qtdMaterial}
                  onChange={(e) => setQtdMaterial(e.target.value)}
                  aria-label="Quantidade do material"
                />
                <Button type="button" variant="outline" className="gap-2" onClick={adicionarMaterial}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>

              {!selecionado && termo.trim() && (
                <div className="max-h-52 overflow-auto rounded-lg border">
                  {isFetching && <div className="p-3 text-sm text-muted-foreground">Buscando…</div>}
                  {!isFetching && resultados.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">Nenhum item encontrado.</div>
                  )}
                  <ul className="divide-y">
                    {resultados.map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                          onClick={() =>
                            setSelecionado({
                              id: i.id,
                              ref: i.referencia ?? String(i.codigo_interno),
                              desc: i.descricao ?? "",
                            })
                          }
                        >
                          <span className="font-medium">{i.referencia || `#${i.codigo_interno}`}</span>{" "}
                          <span className="text-muted-foreground">{i.descricao}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {materiais.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum material adicionado a esta ordem.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {materiais.map((m, idx) => (
                <li key={idx} className="flex items-center gap-3 p-2.5 text-sm">
                  <Badge variant="secondary">
                    {TIPO_MATERIAL_ROTULO[m.tipo_material as keyof typeof TIPO_MATERIAL_ROTULO] ?? m.tipo_material}
                  </Badge>
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{m.referencia}</span>{" "}
                    <span className="text-muted-foreground">{m.descricao}</span>
                  </div>
                  {canEdit ? (
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-24"
                      value={String(m.quantidade)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setMateriais((l) => l.map((x, i) => (i === idx ? { ...x, quantidade: v } : x)));
                        setSujo(true);
                      }}
                      aria-label="Quantidade"
                    />
                  ) : (
                    <span className="tabular-nums">{m.quantidade}</span>
                  )}
                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        setMateriais((l) => l.filter((_, i) => i !== idx));
                        setSujo(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ImageViewer src={zoom} alt={`Ordem ${ordem.numero}`} onClose={() => setZoom(null)} />

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ordem?</AlertDialogTitle>
            <AlertDialogDescription>
              A ordem {ordem.numero} e seus materiais serão removidos permanentemente.
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

function Info({ titulo, valor, icone }: { titulo: string; valor: string; icone?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icone}
        {titulo}
      </div>
      <div className="truncate text-sm font-medium">{valor}</div>
    </div>
  );
}
