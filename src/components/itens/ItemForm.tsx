import { useEffect, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  codigoInternoExiste,
  proximoCodigoInterno,
  UNIDADES,
  useCriarItem,
  useFornecedoresOpcoes,
  useSaveItem,
  type Item,
  type ItemCampo,
} from "@/lib/itens";

const TEXTOS = ["referencia", "marca", "setor", "tipo_item", "imagem_url", "codigo_barras", "deposito", "corredor", "prateleira", "descricao"] as const;
const NUMEROS = ["custo_aquisicao", "preco_venda", "estoque_minimo", "estoque_maximo"] as const;

function paraNumero(v: string | undefined): number | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function ItemForm({
  open,
  onOpenChange,
  campos,
  item,
  onConcluir,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campos: ItemCampo[];
  item?: Item | null;
  onConcluir?: () => void;
}) {
  const criar = useCriarItem();
  const salvar = useSaveItem();
  const { data: fornecedores = [] } = useFornecedoresOpcoes(open);
  const [codigo, setCodigo] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [fornAberto, setFornAberto] = useState(false);
  const adicionais = campos.filter((c) => !c.fixo);
  const editando = !!item;

  useEffect(() => {
    if (!open) return;
    if (item) {
      const f: Record<string, string> = {};
      for (const k of [...TEXTOS, ...NUMEROS, "unidade_medida", "fornecedor_id", "status"] as const) {
        const v = (item as unknown as Record<string, unknown>)[k];
        f[k] = v === null || v === undefined ? "" : NUMEROS.includes(k as never) ? String(v).replace(".", ",") : String(v);
      }
      if (!f.status) f.status = "ativo";
      setForm(f);
      const ex: Record<string, string> = {};
      for (const [k, v] of Object.entries(item.extras ?? {})) ex[k] = v == null ? "" : String(v);
      setExtras(ex);
      setCodigo(String(item.codigo_interno));
    } else {
      setForm({ status: "ativo" });
      setExtras({});
      setCodigo("");
      proximoCodigoInterno().then((n) => setCodigo(String(n))).catch(() => setCodigo(""));
    }
  }, [open, item]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const enviar = async () => {
    const num = Number(codigo);
    if (!codigo.trim() || !Number.isInteger(num) || num <= 0) return toast.error("Informe um código interno válido.");
    const nums: Record<string, number | null> = {};
    for (const k of NUMEROS) {
      const n = paraNumero(form[k]);
      if (Number.isNaN(n) || (n !== null && n < 0)) return toast.error("Valores numéricos inválidos.");
      nums[k] = n;
    }
    if (nums.estoque_minimo !== null && nums.estoque_maximo !== null && nums.estoque_minimo! > nums.estoque_maximo!) {
      return toast.error("O estoque mínimo não pode ser maior que o máximo.");
    }
    try {
      if ((!editando || num !== item!.codigo_interno) && (await codigoInternoExiste(num))) {
        return toast.error(`Já existe um item com o código interno ${num}.`);
      }
      const extrasLimpos: Record<string, unknown> = { ...(item?.extras ?? {}) };
      for (const [k, v] of Object.entries(extras)) {
        if (v.trim() !== "") extrasLimpos[k] = v;
        else delete extrasLimpos[k];
      }
      const payload: Partial<Item> = {
        codigo_interno: num,
        ...Object.fromEntries(TEXTOS.map((k) => [k, form[k]?.trim() || null])),
        ...nums,
        unidade_medida: form.unidade_medida || null,
        fornecedor_id: form.fornecedor_id || null,
        status: form.status === "inativo" ? "inativo" : "ativo",
        extras: extrasLimpos,
      };
      if (editando) await salvar.mutateAsync({ id: item!.id, ...payload });
      else await criar.mutateAsync(payload);
      toast.success(editando ? "Item atualizado." : "Item cadastrado.");
      onConcluir?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const campo = (k: string, rotulo: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`i-${k}`}>{rotulo}</Label>
      <Input id={`i-${k}`} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} {...props} />
    </div>
  );

  const fornSel = fornecedores.find((f) => f.id === form.fornecedor_id);
  const custo = paraNumero(form.custo_aquisicao);
  const preco = paraNumero(form.preco_venda);
  const margem = custo && preco && !Number.isNaN(custo) && !Number.isNaN(preco) ? ((preco - custo) / preco) * 100 : null;
  const pendente = criar.isPending || salvar.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>
            {editando ? "Atualize as informações do item." : "O código interno é sugerido automaticamente e pode ser alterado."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[62vh] pr-4">
          <div className="space-y-6 pb-1">
            <Secao titulo="Identificação">
              <div className="space-y-1.5">
                <Label htmlFor="i-codigo">Código interno</Label>
                <Input id="i-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" />
              </div>
              {campo("referencia", "Referência")}
              {campo("codigo_barras", "Código de barras", { inputMode: "numeric", maxLength: 50 })}
              {campo("marca", "Marca")}
              {campo("setor", "Setor")}
              {campo("tipo_item", "Tipo de item")}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status || "ativo"} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {campo("imagem_url", "URL da imagem")}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="i-descricao">Descrição</Label>
                <Textarea id="i-descricao" rows={3} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
              </div>
            </Secao>

            <Secao titulo="Comercial">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Fornecedor</Label>
                <div className="flex gap-2">
                  <Popover open={fornAberto} onOpenChange={setFornAberto}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
                        <span className="truncate">
                          {fornSel ? `${fornSel.codigo ?? ""} - ${fornSel.razao_social ?? fornSel.nome_fantasia ?? ""}` : "Selecionar fornecedor"}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar por código, nome ou CNPJ…" />
                        <CommandList>
                          <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                          <CommandGroup>
                            {fornecedores.map((f) => (
                              <CommandItem
                                key={f.id}
                                value={`${f.codigo} ${f.razao_social ?? ""} ${f.nome_fantasia ?? ""} ${f.cnpj ?? ""}`}
                                onSelect={() => { set("fornecedor_id", f.id); setFornAberto(false); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", form.fornecedor_id === f.id ? "opacity-100" : "opacity-0")} />
                                <span className="truncate">{f.codigo} - {f.razao_social ?? f.nome_fantasia}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {form.fornecedor_id && (
                    <Button variant="ghost" size="icon" onClick={() => set("fornecedor_id", "")} aria-label="Remover fornecedor">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {campo("custo_aquisicao", "Custo de aquisição (R$)", { inputMode: "decimal", placeholder: "0,00" })}
              {campo("preco_venda", "Preço de venda (R$)", { inputMode: "decimal", placeholder: "0,00" })}
              {margem !== null && (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  Margem: <span className="font-medium text-foreground">{margem.toFixed(1).replace(".", ",")}%</span>
                </p>
              )}
            </Secao>

            <Secao titulo="Estoque">
              <div className="space-y-1.5">
                <Label>Unidade de medida</Label>
                <Select value={form.unidade_medida || undefined} onValueChange={(v) => set("unidade_medida", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div />
              {campo("estoque_minimo", "Estoque mínimo", { inputMode: "decimal" })}
              {campo("estoque_maximo", "Estoque máximo", { inputMode: "decimal" })}
            </Secao>

            <Secao titulo="Localização física">
              {campo("deposito", "Depósito")}
              {campo("corredor", "Corredor")}
              {campo("prateleira", "Prateleira")}
            </Secao>

            {adicionais.length > 0 && (
              <Secao titulo="Informações adicionais">
                {adicionais.map((c) => (
                  <div key={c.chave} className="space-y-1.5">
                    <Label htmlFor={`ix-${c.chave}`}>{c.rotulo}</Label>
                    <Input
                      id={`ix-${c.chave}`}
                      value={extras[c.chave] ?? ""}
                      onChange={(e) => setExtras((f) => ({ ...f, [c.chave]: e.target.value }))}
                    />
                  </div>
                ))}
              </Secao>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={enviar} disabled={pendente}>
            {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
