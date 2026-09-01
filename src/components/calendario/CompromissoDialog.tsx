import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CATEGORIAS, CATEGORIA_ROTULO, paraInput, paraIso,
  useAtualizarCompromisso, useCriarCompromisso,
  type Compromisso,
} from "@/lib/compromissos";
import { useOrdens } from "@/lib/ordens";

export function CompromissoDialog({
  open,
  onOpenChange,
  compromisso,
  dataInicial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  compromisso?: Compromisso | null;
  dataInicial?: Date | null;
}) {
  const criar = useCriarCompromisso();
  const atualizar = useAtualizarCompromisso();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [local, setLocal] = useState("");
  const [categoria, setCategoria] = useState<string>("outro");
  const [ordemId, setOrdemId] = useState<string>("nenhuma");
  const [buscaOrdem, setBuscaOrdem] = useState("");

  const { data: ordens } = useOrdens(buscaOrdem, "todos");

  useEffect(() => {
    if (!open) return;
    if (compromisso) {
      setTitulo(compromisso.titulo);
      setDescricao(compromisso.descricao ?? "");
      setDiaInteiro(compromisso.dia_inteiro);
      setInicio(paraInput(compromisso.inicio, compromisso.dia_inteiro));
      setFim(paraInput(compromisso.fim, compromisso.dia_inteiro));
      setLocal(compromisso.local ?? "");
      setCategoria(compromisso.categoria);
      setOrdemId(compromisso.ordem_id ?? "nenhuma");
    } else {
      const base = dataInicial ?? new Date();
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 0);
      setTitulo(""); setDescricao(""); setDiaInteiro(false);
      setInicio(paraInput(d.toISOString(), false));
      setFim(""); setLocal(""); setCategoria("outro"); setOrdemId("nenhuma");
    }
  }, [open, compromisso, dataInicial]);

  const trocarDiaInteiro = (v: boolean) => {
    setDiaInteiro(v);
    setInicio((prev) => (prev ? (v ? prev.slice(0, 10) : `${prev.slice(0, 10)}T09:00`) : prev));
    setFim((prev) => (prev ? (v ? prev.slice(0, 10) : `${prev.slice(0, 10)}T10:00`) : prev));
  };

  const salvar = async () => {
    if (!titulo.trim()) return toast.error("Informe o título do compromisso.");
    if (!inicio) return toast.error("Informe a data de início.");
    const isoInicio = paraIso(inicio, diaInteiro);
    const isoFim = fim ? paraIso(fim, diaInteiro) : null;
    if (isoFim && isoInicio && isoFim < isoInicio) return toast.error("O término não pode ser antes do início.");

    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      inicio: isoInicio!,
      fim: isoFim,
      dia_inteiro: diaInteiro,
      local: local.trim() || null,
      categoria,
      ordem_id: ordemId === "nenhuma" ? null : ordemId,
    };

    try {
      if (compromisso) {
        await atualizar.mutateAsync({ id: compromisso.id, ...payload });
        toast.success("Compromisso atualizado.");
      } else {
        await criar.mutateAsync(payload);
        toast.success("Compromisso agendado.");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message ?? "Não foi possível salvar.");
    }
  };

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{compromisso ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-titulo">Título *</Label>
            <Input id="c-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Reunião de planejamento" />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label htmlFor="c-dia" className="cursor-pointer">Dia inteiro</Label>
            <Switch id="c-dia" checked={diaInteiro} onCheckedChange={trocarDiaInteiro} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-inicio">Início *</Label>
              <Input id="c-inicio" type={diaInteiro ? "date" : "datetime-local"} value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-fim">Término</Label>
              <Input id="c-fim" type={diaInteiro ? "date" : "datetime-local"} value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{CATEGORIA_ROTULO[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-local">Local</Label>
              <Input id="c-local" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ordem de produção (opcional)</Label>
            <Input value={buscaOrdem} onChange={(e) => setBuscaOrdem(e.target.value)} placeholder="Buscar por nº ou referência..." />
            <Select value={ordemId} onValueChange={setOrdemId}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma</SelectItem>
                {(ordens ?? []).slice(0, 20).map((o) => (
                  <SelectItem key={o.id} value={o.id}>OP {o.numero} · {o.referencia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-desc">Descrição</Label>
            <Textarea id="c-desc" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
