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
import { formatarValor, useSaveItem, type Item, type ItemCampo } from "@/lib/itens";
import { usePermissions } from "@/hooks/use-auth";
import { ImageIcon, Pencil } from "lucide-react";

export function ItemDetalhes({
  item,
  campos,
  onOpenChange,
}: {
  item: Item | null;
  campos: ItemCampo[];
  onOpenChange: (v: boolean) => void;
}) {
  const { canEdit } = usePermissions();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const salvar = useSaveItem();

  useEffect(() => {
    setEditando(false);
    if (item) {
      setForm({
        referencia: item.referencia ?? "",
        descricao: item.descricao ?? "",
        marca: item.marca ?? "",
        setor: item.setor ?? "",
        tipo_item: item.tipo_item ?? "",
        status: item.status ?? "",
        imagem_url: item.imagem_url ?? "",
      });
    }
  }, [item]);

  if (!item) return null;

  const adicionais = campos.filter((c) => !c.fixo);

  const onSalvar = async () => {
    try {
      await salvar.mutateAsync({
        id: item.id,
        referencia: form.referencia || null,
        descricao: form.descricao || null,
        marca: form.marca || null,
        setor: form.setor || null,
        tipo_item: form.tipo_item || null,
        status: form.status || null,
        imagem_url: form.imagem_url || null,
      });
      toast.success("Item atualizado.");
      setEditando(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate">{item.referencia || `Item ${item.codigo_interno}`}</DialogTitle>
          <DialogDescription>Código interno {item.codigo_interno}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {item.imagem_url ? (
                  <img src={item.imagem_url} alt={item.referencia ?? "Item"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <p className="flex-1 text-sm text-muted-foreground">{item.descricao || "Sem descrição."}</p>
            </div>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Informações principais
              </h3>
              {editando ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["referencia", "Referência"],
                      ["marca", "Marca"],
                      ["setor", "Setor"],
                      ["tipo_item", "Tipo de item"],
                      ["status", "Status"],
                      ["imagem_url", "URL da imagem"],
                    ] as const
                  ).map(([k, rotulo]) => (
                    <div key={k} className="space-y-1.5">
                      <Label htmlFor={k}>{rotulo}</Label>
                      <Input
                        id={k}
                        value={form[k] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      rows={3}
                      value={form.descricao ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {campos
                    .filter((c) => c.fixo && c.chave !== "imagem_url")
                    .map((c) => (
                      <div key={c.chave} className="flex flex-col border-b py-1.5">
                        <dt className="text-xs text-muted-foreground">{c.rotulo}</dt>
                        <dd className="text-sm">
                          {formatarValor((item as unknown as Record<string, unknown>)[c.chave])}
                        </dd>
                      </div>
                    ))}
                </dl>
              )}
            </section>

            {adicionais.length > 0 && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Informações adicionais
                </h3>
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {adicionais.map((c) => (
                    <div key={c.chave} className="flex flex-col border-b py-1.5">
                      <dt className="text-xs text-muted-foreground">{c.rotulo}</dt>
                      <dd className="text-sm break-words">{formatarValor(item.extras?.[c.chave])}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          {canEdit && !editando && (
            <Button variant="outline" className="gap-2" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          )}
          {editando && (
            <>
              <Button variant="ghost" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button onClick={onSalvar} disabled={salvar.isPending}>
                {salvar.isPending ? "Salvando…" : "Salvar alterações"}
              </Button>
            </>
          )}
          {!editando && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
