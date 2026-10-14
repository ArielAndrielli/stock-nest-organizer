import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSetores } from "@/lib/queries";
import { useAtribuirSetor } from "@/lib/itens";

const NENHUM = "__nenhum__";

export function AtribuirSetorDialog({
  ids,
  open,
  onOpenChange,
  onConcluir,
}: {
  ids: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConcluir: () => void;
}) {
  const { data: setores = [] } = useSetores();
  const atribuir = useAtribuirSetor();
  const [setor, setSetor] = useState<string>("");
  const [confirmar, setConfirmar] = useState(false);
  const ordenados = [...setores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const nomeSetor = setor === NENHUM ? "Sem setor" : setor;

  const fechar = (v: boolean) => {
    if (!v) {
      setConfirmar(false);
      setSetor("");
    }
    onOpenChange(v);
  };

  const salvar = async () => {
    try {
      await atribuir.mutateAsync({ ids, setor: setor === NENHUM ? null : setor });
      toast.success(`Setor atualizado em ${ids.length} ${ids.length === 1 ? "item" : "itens"}.`);
      onConcluir();
      fechar(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmar ? "Confirmar alteração" : "Atribuir setor"}</DialogTitle>
          <DialogDescription>
            {confirmar
              ? `O setor de ${ids.length} ${ids.length === 1 ? "item" : "itens"} será alterado para "${nomeSetor}". Deseja continuar?`
              : `Escolha o setor para ${ids.length} ${ids.length === 1 ? "item selecionado" : "itens selecionados"}.`}
          </DialogDescription>
        </DialogHeader>
        {!confirmar && (
          <Select value={setor} onValueChange={setSetor}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUM}>Sem setor</SelectItem>
              {ordenados.map((s) => (
                <SelectItem key={s.id} value={s.nome}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          {confirmar ? (
            <>
              <Button variant="outline" onClick={() => setConfirmar(false)} disabled={atribuir.isPending}>
                Voltar
              </Button>
              <Button onClick={salvar} disabled={atribuir.isPending}>
                {atribuir.isPending ? "Salvando…" : "Confirmar e salvar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => fechar(false)}>
                Cancelar
              </Button>
              <Button disabled={!setor} onClick={() => setConfirmar(true)}>
                Continuar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
