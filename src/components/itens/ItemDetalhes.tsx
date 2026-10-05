import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatarValor, valorCampo, type Item, type ItemCampo } from "@/lib/itens";
import { usePermissions } from "@/hooks/use-auth";
import { ImageIcon, Pencil } from "lucide-react";
import { ImageViewer } from "@/components/ImageViewer";
import { ItemForm } from "@/components/itens/ItemForm";
import { StatusBadge } from "@/components/itens/StatusBadge";

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
  const [zoom, setZoom] = useState<string | null>(null);

  if (!item) return null;

  const adicionais = campos.filter((c) => !c.fixo);
  const custo = item.custo_aquisicao != null ? Number(item.custo_aquisicao) : null;
  const preco = item.preco_venda != null ? Number(item.preco_venda) : null;
  const margem = custo && preco ? ((preco - custo) / preco) * 100 : null;

  return (
    <>
      <Dialog open={!!item && !editando} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 truncate">
              {item.referencia || `Item ${item.codigo_interno}`}
              <StatusBadge status={item.status} />
            </DialogTitle>
            <DialogDescription>Código interno {item.codigo_interno}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {item.imagem_url ? (
                    <button type="button" onClick={() => setZoom(item.imagem_url!)} className="h-full w-full cursor-zoom-in" aria-label="Ampliar imagem">
                      <img src={item.imagem_url} alt={item.referencia ?? "Item"} className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">{item.descricao || "Sem descrição."}</p>
                  {margem !== null && (
                    <p className="text-sm">
                      Margem: <span className="font-semibold">{margem.toFixed(1).replace(".", ",")}%</span>
                    </p>
                  )}
                </div>
              </div>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informações principais</h3>
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {campos
                    .filter((c) => c.fixo && c.chave !== "imagem_url")
                    .map((c) => (
                      <div key={c.chave} className="flex flex-col border-b py-1.5">
                        <dt className="text-xs text-muted-foreground">{c.rotulo}</dt>
                        <dd className="text-sm">{formatarValor(valorCampo(item, c.chave))}</dd>
                      </div>
                    ))}
                </dl>
              </section>

              {adicionais.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informações adicionais</h3>
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {adicionais.map((c) => (
                      <div key={c.chave} className="flex flex-col border-b py-1.5">
                        <dt className="text-xs text-muted-foreground">{c.rotulo}</dt>
                        <dd className="break-words text-sm">{formatarValor(item.extras?.[c.chave])}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            {canEdit && (
              <Button variant="outline" className="gap-2" onClick={() => setEditando(true)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
          <ImageViewer src={zoom} alt={item.referencia ?? "Item"} onClose={() => setZoom(null)} />
        </DialogContent>
      </Dialog>
      <ItemForm
        open={editando}
        onOpenChange={(v) => { if (!v) { setEditando(false); onOpenChange(false); } }}
        campos={campos}
        item={item}
      />
    </>
  );
}
