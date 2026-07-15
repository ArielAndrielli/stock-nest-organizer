import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QrCode, Barcode } from "@/components/QrCode";
import { useSetores, useVagas, useCaixas } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/etiquetas")({
  head: () => ({ meta: [{ title: "Etiquetas · Estoque" }, { name: "robots", content: "noindex" }] }),
  component: EtiquetasPage,
});

type Item = { id: string; nome: string; sub: string; href: string; barcode: string };
type Tamanho = "P" | "M" | "G";

const tamanhos: Record<Tamanho, { w: string; h: string; label: string; qr: number; bc: number }> = {
  P: { w: "50mm", h: "30mm", label: "Pequena", qr: 60, bc: 22 },
  M: { w: "70mm", h: "45mm", label: "Média", qr: 80, bc: 32 },
  G: { w: "105mm", h: "70mm", label: "Grande (A6)", qr: 130, bc: 50 },
};

function EtiquetasPage() {
  const { data: setores } = useSetores();
  const { data: vagas } = useVagas();
  const { data: caixas } = useCaixas();
  const [tipo, setTipo] = useState<"setor" | "vaga" | "caixa">("vaga");
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [tamanho, setTamanho] = useState<Tamanho>("M");
  const [setorFilter, setSetorFilter] = useState<string>("todos");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const itens: Item[] = useMemo(() => {
    if (tipo === "setor") {
      return (setores ?? []).map((s) => ({
        id: s.id, nome: s.nome, sub: "Setor", href: `${origin}/setor/${s.id}`, barcode: s.id.slice(0, 20),
      }));
    }
    if (tipo === "vaga") {
      return (vagas ?? [])
        .filter((v) => setorFilter === "todos" || v.setor_id === setorFilter)
        .map((v) => {
          const setor = setores?.find((s) => s.id === v.setor_id);
          return { id: v.id, nome: `Vaga ${v.codigo}`, sub: setor?.nome ?? "", href: `${origin}/vaga/${v.id}`, barcode: v.id.slice(0, 20) };
        });
    }
    return (caixas ?? [])
      .filter((c) => {
        if (setorFilter === "todos") return true;
        const vg = vagas?.find((v) => v.id === c.vaga_id);
        return vg?.setor_id === setorFilter;
      })
      .map((c) => {
        const vg = vagas?.find((v) => v.id === c.vaga_id);
        return { id: c.id, nome: c.nome, sub: vg ? `Vaga ${vg.codigo}` : "", href: `${origin}/caixa/${c.id}`, barcode: c.id.slice(0, 20) };
      });
  }, [tipo, setores, vagas, caixas, setorFilter, origin]);

  const escolhidos = itens.filter((i) => selecionados[i.id]);
  const toggleAll = (v: boolean) => setSelecionados(Object.fromEntries(itens.map((i) => [i.id, v])));

  const t = tamanhos[tamanho];

  return (
    <AppShell>
      <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Etiquetas</h1>
          <p className="text-sm text-muted-foreground">Gere etiquetas com QR code e código de barras.</p>
        </div>
        <Button onClick={() => window.print()} disabled={escolhidos.length === 0} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir ({escolhidos.length})
        </Button>
      </div>

      <Card className="no-print mb-6 animate-fade-in">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto_auto]">
          <Tabs value={tipo} onValueChange={(v) => { setTipo(v as typeof tipo); setSelecionados({}); }}>
            <TabsList>
              <TabsTrigger value="setor">Setores</TabsTrigger>
              <TabsTrigger value="vaga">Vagas</TabsTrigger>
              <TabsTrigger value="caixa">Caixas</TabsTrigger>
            </TabsList>
            <TabsContent value={tipo} />
          </Tabs>
          {tipo !== "setor" && (
            <Select value={setorFilter} onValueChange={setSetorFilter}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {(setores ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={tamanho} onValueChange={(v) => setTamanho(v as Tamanho)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(tamanhos) as Tamanho[]).map((k) => (
                <SelectItem key={k} value={k}>{tamanhos[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="no-print mb-3 flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={itens.length > 0 && itens.every((i) => selecionados[i.id])}
            onCheckedChange={(v) => toggleAll(!!v)}
          />
          Selecionar todos ({itens.length})
        </label>
        <span className="text-muted-foreground">·  {escolhidos.length} selecionado(s)</span>
      </div>

      <div className="no-print grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {itens.map((i) => (
          <label key={i.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent cursor-pointer">
            <Checkbox
              checked={!!selecionados[i.id]}
              onCheckedChange={(v) => setSelecionados((s) => ({ ...s, [i.id]: !!v }))}
            />
            <div className="min-w-0">
              <div className="truncate font-medium text-sm">{i.nome}</div>
              {i.sub && <div className="truncate text-xs text-muted-foreground">{i.sub}</div>}
            </div>
          </label>
        ))}
      </div>

      {/* PRINT AREA */}
      <div className="print-area flex flex-wrap gap-2">
        {escolhidos.map((i) => (
          <div
            key={i.id}
            className="etiqueta flex flex-col items-center justify-between gap-1 border border-dashed p-2 bg-white"
            style={{ width: t.w, height: t.h }}
          >
            <div className="text-center text-[10px] font-semibold leading-tight line-clamp-2">{i.nome}</div>
            <QrCode value={i.href} size={t.qr} />
            <Barcode value={i.barcode} height={t.bc} width={1.2} />
            {i.sub && <div className="text-[8px] text-muted-foreground">{i.sub}</div>}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
