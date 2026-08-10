import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useValoresDistintos, type ItemCampo } from "@/lib/itens";
import { X } from "lucide-react";

const TODOS = "__todos__";

function FiltroCampo({
  campo,
  valor,
  onChange,
  ativo,
}: {
  campo: ItemCampo;
  valor: string;
  onChange: (v: string) => void;
  ativo: boolean;
}) {
  const { data: opcoes, isLoading } = useValoresDistintos(campo.chave, ativo);
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{campo.rotulo}</div>
      <Select value={valor || TODOS} onValueChange={(v) => onChange(v === TODOS ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Carregando…" : "Todos"} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={TODOS}>Todos</SelectItem>
          {(opcoes ?? []).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FiltrosSheet({
  open,
  onOpenChange,
  campos,
  filtros,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campos: ItemCampo[];
  filtros: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const filtraveis = campos.filter((c) => c.filtravel);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Combine filtros para refinar a lista de itens.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="-mx-6 flex-1 px-6">
          <div className="space-y-4 py-4">
            {filtraveis.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum campo está marcado como filtrável.</p>
            )}
            {filtraveis.map((c) => (
              <FiltroCampo
                key={c.chave}
                campo={c}
                ativo={open}
                valor={filtros[c.chave] ?? ""}
                onChange={(v) => onChange({ ...filtros, [c.chave]: v })}
              />
            ))}
          </div>
        </ScrollArea>
        <div className="border-t pt-4">
          <Button variant="outline" className="w-full gap-2" onClick={() => onChange({})}>
            <X className="h-4 w-4" /> Limpar filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
