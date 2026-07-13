import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function VagaDetail() {
  const { id } = Route.useParams();
  const { vaga, hydrated, addSubItem, removeSubItem, updateSubItem, removeVaga } = useVaga(id);
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagem, setImagem] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem muito grande (máx. 2MB).");
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      setImagem(url);
    } catch {
      toast.error("Falha ao ler a imagem.");
    }
  };

  const resetForm = () => {
    setNome("");
    setQuantidade("");
    setDescricao("");
    setImagem(undefined);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (subId: string) => {
    const s = vaga.subItens.find((x) => x.id === subId);
    if (!s) return;
    setNome(s.nome);
    setQuantidade(String(s.quantidade));
    setDescricao(s.descricao || "");
    setImagem(s.imagem);
    setEditingId(subId);
    toast.info("Editando item.");
  };

  const cancelEdit = () => {
    resetForm();
    toast.info("Edição cancelada.");
  };

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
    if (editingId) {
      updateSubItem(vaga.id, editingId, {
        nome: nome.trim(),
        quantidade: qtd,
        descricao: descricao.trim() || undefined,
        imagem,
      });
      toast.success("Item atualizado.");
    } else {
      addSubItem(vaga.id, {
        nome: nome.trim(),
        quantidade: qtd,
        descricao: descricao.trim() || undefined,
        imagem,
      });
      toast.success("Item adicionado.");
    }
    resetForm();
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
            <CardTitle className="text-base">
              {editingId ? "Editar sub-item" : "Adicionar sub-item"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Imagem (capa)</Label>
                {imagem ? (
                  <div className="relative overflow-hidden rounded-md border">
                    <img
                      src={imagem}
                      alt="Prévia"
                      className="aspect-[16/9] w-full object-cover"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-2 h-7 w-7"
                      onClick={() => {
                        setImagem(undefined);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      aria-label="Remover imagem"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground transition hover:bg-muted/60"
                  >
                    <ImagePlus className="h-5 w-5" />
                    Selecionar imagem
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFile}
                />
              </div>
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
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? (
                    <>
                      <Pencil className="mr-2 h-4 w-4" /> Salvar alterações
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" /> Adicionar item
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                )}
              </div>
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {vaga.subItens.map((s) => (
                  <Card key={s.id} className="overflow-hidden">
                    {s.imagem ? (
                      <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                        <img
                          src={s.imagem}
                          alt={s.nome}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.nome}</p>
                          {s.descricao && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {s.descricao}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {s.quantidade}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          removeSubItem(vaga.id, s.id);
                          toast.success("Item removido.");
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remover
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
