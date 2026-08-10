import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COLUNAS_PADRAO, type ItemCampo } from "@/lib/itens";
import { RotateCcw } from "lucide-react";

export function ColunasSheet({
  open,
  onOpenChange,
  campos,
  visiveis,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campos: ItemCampo[];
  visiveis: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (chave: string, checked: boolean) => {
    const set = new Set(visiveis);
    if (checked) set.add(chave);
    else set.delete(chave);
    onChange(campos.filter((c) => set.has(c.chave)).map((c) => c.chave));
  };

  const principais = campos.filter((c) => c.fixo);
  const adicionais = campos.filter((c) => !c.fixo);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configurar colunas</SheetTitle>
          <SheetDescription>Escolha quais campos aparecem na grade. Salvo automaticamente para você.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="-mx-6 flex-1 px-6">
          <div className="space-y-6 py-4">
            <Secao titulo="Informações principais" campos={principais} visiveis={visiveis} toggle={toggle} />
            {adicionais.length > 0 && (
              <Secao titulo="Informações adicionais" campos={adicionais} visiveis={visiveis} toggle={toggle} />
            )}
          </div>
        </ScrollArea>
        <div className="border-t pt-4">
          <Button variant="outline" className="w-full gap-2" onClick={() => onChange(COLUNAS_PADRAO)}>
            <RotateCcw className="h-4 w-4" /> Restaurar padrão
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Secao({
  titulo,
  campos,
  visiveis,
  toggle,
}: {
  titulo: string;
  campos: ItemCampo[];
  visiveis: string[];
  toggle: (chave: string, checked: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <div className="space-y-1">
        {campos.map((c) => (
          <label
            key={c.chave}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
          >
            <Checkbox
              checked={visiveis.includes(c.chave)}
              onCheckedChange={(v) => toggle(c.chave, v === true)}
            />
            <span className="text-sm">{c.rotulo}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
