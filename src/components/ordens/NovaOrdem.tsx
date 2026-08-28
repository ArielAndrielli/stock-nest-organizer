import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useItens } from "@/lib/itens";
import { ImageField } from "@/components/ImageField";

import {
  TIPOS_MATERIAL,
  TIPO_MATERIAL_ROTULO,
  proximoNumeroOrdem,
  useCriarOrdem,
  type NovoMaterial,
} from "@/lib/ordens";

export function NovaOrdem({
  open,
  onOpenChange,
  onCriada,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCriada?: (id: string) => void;
}) {
  const criar = useCriarOrdem();
  const [numero, setNumero] = useState("");
  const [referencia, setReferencia] = useState("");
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacoes, setObservacoes] = useState("");
  const [materiais, setMateriais] = useState<NovoMaterial[]>([]);
  const [imagem, setImagem] = useState<string | null>(null);
  const [termoRef, setTermoRef] = useState("");
  const [refFocado, setRefFocado] = useState(false);

  const [tipo, setTipo] = useState<string>("cartao");
  const [buscaItem, setBuscaItem] = useState("");
  const [termo, setTermo] = useState("");
  const [qtdMaterial, setQtdMaterial] = useState("1");
  const [selecionado, setSelecionado] = useState<{ id: string; ref: string; desc: string } | null>(null);


  useEffect(() => {
    if (!open) return;
    setReferencia("");
    setDescricao("");
    setQuantidade("1");
    setObservacoes("");
    setMateriais([]);
    setImagem(null);
    setTermoRef("");
    setRefFocado(false);
    setSelecionado(null);
    setBuscaItem("");
    setTermo("");
    proximoNumeroOrdem().then(setNumero).catch(() => setNumero(""));
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setTermo(buscaItem), 250);
    return () => clearTimeout(t);
  }, [buscaItem]);

  useEffect(() => {
    const t = setTimeout(() => setTermoRef(referencia), 250);
    return () => clearTimeout(t);
  }, [referencia]);

  const { data: busca, isFetching } = useItens({
    q: termo,
    filtros: {},
    ordenarPor: "codigo_interno",
    ordem: "asc",
    pagina: 1,
    porPagina: 8,
  });

  const { data: buscaRef } = useItens({
    q: termoRef,
    filtros: {},
    ordenarPor: "codigo_interno",
    ordem: "asc",
    pagina: 1,
    porPagina: 8,
  });

  const sugestoesRef = useMemo(
    () => (termoRef.trim() ? (buscaRef?.rows ?? []) : []),
    [buscaRef, termoRef],
  );

  const resultados = useMemo(() => (termo.trim() ? (busca?.rows ?? []) : []), [busca, termo]);


  const adicionarMaterial = () => {
    if (!selecionado) return toast.error("Selecione um item da base.");
    const q = Number(qtdMaterial.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) return toast.error("Informe uma quantidade válida.");
    setMateriais((m) => [
      ...m,
      {
        item_id: selecionado.id,
        tipo_material: tipo,
        referencia: selecionado.ref,
        descricao: selecionado.desc,
        quantidade: q,
      },
    ]);
    setSelecionado(null);
    setBuscaItem("");
    setTermo("");
    setQtdMaterial("1");
  };

  const salvar = async () => {
    const qtd = Number(quantidade);
    if (!numero.trim()) return toast.error("Informe o nº da ordem.");
    if (!referencia.trim()) return toast.error("Informe a referência.");
    if (!descricao.trim()) return toast.error("Informe a descrição do produto.");
    if (!Number.isFinite(qtd) || qtd <= 0) return toast.error("Informe uma quantidade válida.");
    try {
      const id = await criar.mutateAsync({
        numero: numero.trim(),
        referencia: referencia.trim(),
        descricao: descricao.trim(),
        quantidade: qtd,
        observacoes,
        materiais,
      });
      toast.success("Ordem de produção criada.");
      onOpenChange(false);
      onCriada?.(id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Nova ordem de produção</DialogTitle>
          <DialogDescription>
            A ordem começa no status “Aguardando separação”. Criador e data são registrados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[62vh] pr-4">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="numero">Nº da ordem</Label>
                <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div className="relative space-y-1.5">
                <Label htmlFor="ref">Referência</Label>
                <Input
                  id="ref"
                  autoComplete="off"
                  value={referencia}
                  onFocus={() => setRefFocado(true)}
                  onBlur={() => setTimeout(() => setRefFocado(false), 150)}
                  onChange={(e) => setReferencia(e.target.value)}
                />
                {refFocado && sugestoesRef.length > 0 && (
                  <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-popover shadow-md">
                    {sugestoesRef.map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setReferencia(i.referencia ?? String(i.codigo_interno));
                            if (i.descricao) setDescricao(i.descricao);
                            setTermoRef("");
                            setRefFocado(false);
                          }}
                        >
                          <span className="font-medium">{i.referencia || `#${i.codigo_interno}`}</span>{" "}
                          <span className="text-muted-foreground">{i.descricao}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="desc">Descrição do produto</Label>
                <Input id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qtd">Quantidade</Label>
                <Input
                  id="qtd"
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="obs">Observações (opcional)</Label>
                <Textarea id="obs" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <ImageField value={imagem} onChange={setImagem} label="Imagem da ordem" />
              </div>

            </div>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Materiais da ordem
              </h3>

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

              {materiais.length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {materiais.map((m, idx) => (
                    <li key={idx} className="flex items-center gap-3 p-2.5 text-sm">
                      <Badge variant="secondary">
                        {TIPO_MATERIAL_ROTULO[m.tipo_material as keyof typeof TIPO_MATERIAL_ROTULO] ??
                          m.tipo_material}
                      </Badge>
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{m.referencia}</span>{" "}
                        <span className="text-muted-foreground">{m.descricao}</span>
                      </div>
                      <span className="tabular-nums">{m.quantidade}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setMateriais((l) => l.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={criar.isPending}>
            {criar.isPending ? "Criando…" : "Criar ordem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
