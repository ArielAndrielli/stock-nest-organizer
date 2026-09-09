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
  somenteDigitos,
  useCriarFornecedor,
  useSalvarFornecedor,
  type Fornecedor,
  type FornecedorCampo,
} from "@/lib/fornecedores";

const CAMPOS: Array<[string, string]> = [
  ["nome", "Nome"],
  ["cnpj", "CNPJ"],
  ["telefone", "Telefone"],
  ["email", "E-mail"],
  ["cidade", "Cidade"],
  ["uf", "UF"],
];

export function FornecedorDialog({
  open,
  onOpenChange,
  fornecedor,
  campos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fornecedor?: Fornecedor | null;
  campos: FornecedorCampo[];
}) {
  const criar = useCriarFornecedor();
  const salvar = useSalvarFornecedor();
  const [form, setForm] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<string, string>>({});
  const adicionais = campos.filter((c) => !c.fixo);

  useEffect(() => {
    if (!open) return;
    setForm({
      nome: fornecedor?.nome ?? "",
      cnpj: fornecedor?.cnpj ?? "",
      telefone: fornecedor?.telefone ?? "",
      email: fornecedor?.email ?? "",
      cidade: fornecedor?.cidade ?? "",
      uf: fornecedor?.uf ?? "",
      observacoes: fornecedor?.observacoes ?? "",
    });
    const e: Record<string, string> = {};
    for (const c of campos.filter((x) => !x.fixo)) {
      const v = fornecedor?.extras?.[c.chave];
      e[c.chave] = v === null || v === undefined ? "" : String(v);
    }
    setExtras(e);
  }, [open, fornecedor, campos]);

  const enviar = async () => {
    if (!form.nome?.trim()) {
      toast.error("Informe o nome do fornecedor.");
      return;
    }
    const cnpj = somenteDigitos(form.cnpj ?? "");
    if (cnpj && cnpj.length !== 14) {
      toast.error("O CNPJ deve ter 14 dígitos.");
      return;
    }
    const extrasLimpos: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(extras)) if (v.trim() !== "") extrasLimpos[k] = v;

    const payload = {
      nome: form.nome.trim(),
      cnpj: cnpj || null,
      telefone: form.telefone?.trim() || null,
      email: form.email?.trim() || null,
      cidade: form.cidade?.trim() || null,
      uf: form.uf?.trim().toUpperCase() || null,
      observacoes: form.observacoes?.trim() || null,
      extras: extrasLimpos,
    };

    try {
      if (fornecedor) {
        await salvar.mutateAsync({ id: fornecedor.id, ...payload });
        toast.success("Fornecedor atualizado.");
      } else {
        await criar.mutateAsync(payload);
        toast.success("Fornecedor cadastrado.");
      }
      onOpenChange(false);
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(/duplicate|unique/i.test(msg) ? "Já existe um fornecedor com este CNPJ." : msg);
    }
  };

  const pendente = criar.isPending || salvar.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{fornecedor ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>Preencha os dados do fornecedor.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {CAMPOS.map(([k, rotulo]) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`f-${k}`}>{rotulo}</Label>
                <Input
                  id={`f-${k}`}
                  value={form[k] ?? ""}
                  onChange={(ev) => setForm((f) => ({ ...f, [k]: ev.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="f-observacoes">Observações</Label>
              <Textarea
                id="f-observacoes"
                rows={3}
                value={form.observacoes ?? ""}
                onChange={(ev) => setForm((f) => ({ ...f, observacoes: ev.target.value }))}
              />
            </div>
            {adicionais.map((c) => (
              <div key={c.chave} className="space-y-1.5">
                <Label htmlFor={`fx-${c.chave}`}>{c.rotulo}</Label>
                <Input
                  id={`fx-${c.chave}`}
                  value={extras[c.chave] ?? ""}
                  onChange={(ev) => setExtras((f) => ({ ...f, [c.chave]: ev.target.value }))}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={pendente}>
            {pendente ? "Salvando…" : fornecedor ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
