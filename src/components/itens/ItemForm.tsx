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
import { toast } from "sonner";
import {
  codigoInternoExiste,
  proximoCodigoInterno,
  useCriarItem,
  type ItemCampo,
} from "@/lib/itens";

const CAMPOS: Array<[string, string]> = [
  ["referencia", "Referência"],
  ["marca", "Marca"],
  ["setor", "Setor"],
  ["tipo_item", "Tipo de item"],
  ["status", "Status"],
  ["imagem_url", "URL da imagem"],
];

export function ItemForm({
  open,
  onOpenChange,
  campos,
  onConcluir,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campos: ItemCampo[];
  onConcluir?: () => void;
}) {
  const criar = useCriarItem();
  const [codigo, setCodigo] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<string, string>>({});
  const adicionais = campos.filter((c) => !c.fixo);

  useEffect(() => {
    if (!open) return;
    setForm({});
    setExtras({});
    setCodigo("");
    proximoCodigoInterno()
      .then((n) => setCodigo(String(n)))
      .catch(() => setCodigo(""));
  }, [open]);

  const enviar = async () => {
    const num = Number(codigo);
    if (!codigo.trim() || !Number.isInteger(num) || num <= 0) {
      toast.error("Informe um código interno válido.");
      return;
    }
    try {
      if (await codigoInternoExiste(num)) {
        toast.error(`Já existe um item com o código interno ${num}.`);
        return;
      }
      const extrasLimpos: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(extras)) if (v.trim() !== "") extrasLimpos[k] = v;

      await criar.mutateAsync({
        codigo_interno: num,
        referencia: form.referencia?.trim() || null,
        descricao: form.descricao?.trim() || null,
        marca: form.marca?.trim() || null,
        setor: form.setor?.trim() || null,
        tipo_item: form.tipo_item?.trim() || null,
        status: form.status?.trim() || null,
        imagem_url: form.imagem_url?.trim() || null,
        extras: extrasLimpos,
      });
      toast.success("Item cadastrado.");
      onConcluir?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Novo item</DialogTitle>
          <DialogDescription>O código interno é sugerido automaticamente e pode ser alterado.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="i-codigo">Código interno</Label>
              <Input id="i-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" />
            </div>
            {CAMPOS.map(([k, rotulo]) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`i-${k}`}>{rotulo}</Label>
                <Input
                  id={`i-${k}`}
                  value={form[k] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="i-descricao">Descrição</Label>
              <Textarea
                id="i-descricao"
                rows={3}
                value={form.descricao ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
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
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={criar.isPending}>
            {criar.isPending ? "Salvando…" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
