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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MAX_DIGITOS_DOCUMENTO,
  proximoCodigoFornecedor,
  somenteDigitos,
  UFS,
  useCriarFornecedor,
  useSalvarFornecedor,
  type Fornecedor,
  type FornecedorCampo,
} from "@/lib/fornecedores";

const CAMPOS: Array<[string, string]> = [
  ["razao_social", "Razão Social"],
  ["nome_fantasia", "Nome Fantasia"],
  ["cnpj", "CNPJ"],
  ["inscricao_estadual", "Inscrição Estadual"],
  ["telefone", "Telefone"],
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
      codigo: fornecedor?.codigo != null ? String(fornecedor.codigo) : "",
      razao_social: fornecedor?.razao_social ?? fornecedor?.nome ?? "",
      nome_fantasia: fornecedor?.nome_fantasia ?? "",
      cnpj: fornecedor?.cnpj ?? "",
      inscricao_estadual: fornecedor?.inscricao_estadual ?? "",
      uf: fornecedor?.uf ?? "",
      telefone: fornecedor?.telefone ?? "",
    });
    const e: Record<string, string> = {};
    for (const c of campos.filter((x) => !x.fixo)) {
      const v = fornecedor?.extras?.[c.chave];
      e[c.chave] = v === null || v === undefined ? "" : String(v);
    }
    setExtras(e);
    if (!fornecedor) {
      proximoCodigoFornecedor()
        .then((n) => setForm((f) => ({ ...f, codigo: String(n) })))
        .catch(() => undefined);
    }
  }, [open, fornecedor, campos]);

  const enviar = async () => {
    if (!form.razao_social?.trim()) {
      toast.error("Informe a Razão Social.");
      return;
    }
    const cnpj = somenteDigitos(form.cnpj ?? "");
    if (cnpj.length > MAX_DIGITOS_DOCUMENTO) {
      toast.error(`O documento pode ter no máximo ${MAX_DIGITOS_DOCUMENTO} dígitos.`);
      return;
    }
    const extrasLimpos: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(extras)) if (v.trim() !== "") extrasLimpos[k] = v;

    const codigoNum = Number(form.codigo);
    const payload = {
      codigo: Number.isFinite(codigoNum) && codigoNum > 0 ? codigoNum : null,
      razao_social: form.razao_social.trim(),
      nome: form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia?.trim() || null,
      cnpj: cnpj || null,
      inscricao_estadual: form.inscricao_estadual?.trim() || null,
      uf: form.uf?.trim().toUpperCase() || null,
      telefone: form.telefone?.trim() || null,
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
      toast.error(
        /codigo/i.test(msg) && /duplicate|unique/i.test(msg)
          ? "Já existe um fornecedor com este código."
          : /duplicate|unique/i.test(msg)
            ? "Já existe um fornecedor com este CNPJ."
            : msg,
      );
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
            <div className="space-y-1.5">
              <Label htmlFor="f-codigo">Código</Label>
              <Input
                id="f-codigo"
                inputMode="numeric"
                value={form.codigo ?? ""}
                onChange={(ev) => setForm((f) => ({ ...f, codigo: ev.target.value.replace(/\D+/g, "") }))}
              />
            </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="f-uf">Estado</Label>
              <Select
                value={form.uf || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, uf: v }))}
              >
                <SelectTrigger id="f-uf">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
