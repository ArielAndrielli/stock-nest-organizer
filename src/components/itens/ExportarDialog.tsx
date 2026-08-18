import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  buscarTodosItens,
  formatarValor,
  valorCampo,
  type Item,
  type ItemCampo,
} from "@/lib/itens";

export type ExportArgs = {
  q: string;
  filtros: Record<string, string>;
  ordenarPor: string;
  ordem: "asc" | "desc";
};

export function ExportarDialog({
  open,
  onOpenChange,
  campos,
  colunasVisiveis,
  linhasPagina,
  args,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campos: ItemCampo[];
  colunasVisiveis: ItemCampo[];
  linhasPagina: Item[];
  args: ExportArgs;
}) {
  const [abrangencia, setAbrangencia] = useState<"pagina" | "todos">("pagina");
  const [escopoColunas, setEscopoColunas] = useState<"visiveis" | "todos">("visiveis");
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const exportar = async () => {
    const cols = escopoColunas === "todos" ? campos : colunasVisiveis;
    if (cols.length === 0) return toast.error("Nenhuma coluna selecionada para exportar.");
    setCarregando(true);
    setProgresso(0);
    try {
      const linhas =
        abrangencia === "pagina" ? linhasPagina : await buscarTodosItens(args, (n) => setProgresso(n));
      const dados = linhas.map((r) => {
        const o: Record<string, unknown> = {};
        for (const c of cols) o[c.rotulo] = formatarValor(valorCampo(r, c.chave));
        return o;
      });
      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Itens");
      XLSX.writeFile(wb, "itens.xlsx");
      toast.success(`${linhas.length.toLocaleString("pt-BR")} registros exportados.`);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !carregando && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar planilha</DialogTitle>
          <DialogDescription>Escolha o que deseja incluir no arquivo Excel.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Registros
            </Label>
            <RadioGroup value={abrangencia} onValueChange={(v) => setAbrangencia(v as "pagina" | "todos")}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
                <RadioGroupItem value="pagina" /> Apenas a página atual ({linhasPagina.length})
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
                <RadioGroupItem value="todos" /> Todos os registros do filtro atual
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Colunas
            </Label>
            <RadioGroup value={escopoColunas} onValueChange={(v) => setEscopoColunas(v as "visiveis" | "todos")}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
                <RadioGroupItem value="visiveis" /> Apenas colunas visíveis ({colunasVisiveis.length})
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
                <RadioGroupItem value="todos" /> Todos os campos ({campos.length})
              </label>
            </RadioGroup>
          </div>

          {carregando && abrangencia === "todos" && (
            <p className="text-sm text-muted-foreground">
              Baixando registros… {progresso.toLocaleString("pt-BR")} carregados.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={carregando}>
            Cancelar
          </Button>
          <Button onClick={exportar} disabled={carregando}>
            {carregando ? "Exportando…" : "Exportar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
