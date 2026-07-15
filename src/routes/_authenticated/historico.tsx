import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useHistorico } from "@/lib/queries";
import { Pencil, Plus, Trash2, ArrowRightLeft, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico · Estoque" }, { name: "robots", content: "noindex" }] }),
  component: Historico,
});

const acaoIcon: Record<string, React.ReactNode> = {
  criar: <Plus className="h-4 w-4" />,
  editar: <Pencil className="h-4 w-4" />,
  excluir: <Trash2 className="h-4 w-4" />,
  mover: <ArrowRightLeft className="h-4 w-4" />,
  imagem: <ImageIcon className="h-4 w-4" />,
};

const acaoLabel: Record<string, string> = {
  criar: "Criado", editar: "Editado", excluir: "Excluído", mover: "Movida", imagem: "Imagem alterada",
};

function detalheTexto(ev: { acao: string; entidade: string; detalhes: unknown }): string {
  const d = (ev.detalhes ?? {}) as Record<string, unknown>;
  if (ev.acao === "mover") return `de Vaga ${d.de ?? "?"} → Vaga ${d.para ?? "?"}`;
  if (ev.acao === "imagem") return d.para ? "Nova imagem" : "Imagem removida";
  if (ev.acao === "editar" && d.campos && typeof d.campos === "object") {
    const keys = Object.keys(d.campos as object);
    return keys.length ? `Campos: ${keys.join(", ")}` : "";
  }
  return "";
}

function Historico() {
  const { data, isLoading } = useHistorico();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<string>("todos");
  const [acao, setAcao] = useState<string>("todas");

  const filtrados = useMemo(() => {
    return (data ?? []).filter((e) => {
      if (tipo !== "todos" && e.entidade !== tipo) return false;
      if (acao !== "todas" && e.acao !== acao) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        if (
          !(e.entidade_nome ?? "").toLowerCase().includes(s) &&
          !(e.usuario_email ?? "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [data, q, tipo, acao]);

  const grupos = useMemo(() => {
    const g = new Map<string, typeof filtrados>();
    for (const e of filtrados) {
      const d = new Date(e.criado_em).toLocaleDateString("pt-BR");
      if (!g.has(d)) g.set(d, []);
      g.get(d)!.push(e);
    }
    return Array.from(g.entries());
  }, [filtrados]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Histórico de alterações</h1>
        <p className="text-sm text-muted-foreground">Todas as ações realizadas no sistema.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Buscar por nome ou usuário…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas entidades</SelectItem>
            <SelectItem value="setor">Setor</SelectItem>
            <SelectItem value="vaga">Vaga</SelectItem>
            <SelectItem value="caixa">Caixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={acao} onValueChange={setAcao}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas ações</SelectItem>
            <SelectItem value="criar">Criação</SelectItem>
            <SelectItem value="editar">Edição</SelectItem>
            <SelectItem value="imagem">Imagem</SelectItem>
            <SelectItem value="mover">Movimentação</SelectItem>
            <SelectItem value="excluir">Exclusão</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

      {!isLoading && grupos.length === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center animate-fade-in">
          <p className="font-medium">Nenhum evento encontrado</p>
        </div>
      )}

      <div className="space-y-6">
        {grupos.map(([dia, evs]) => (
          <div key={dia}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{dia}</h2>
            <div className="space-y-2">
              {evs.map((e) => (
                <Card key={e.id} className="animate-fade-in">
                  <CardContent className="flex items-start gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {acaoIcon[e.acao] ?? <Pencil className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="font-semibold">{acaoLabel[e.acao] ?? e.acao}</span>
                        <span className="uppercase text-[10px] font-semibold text-muted-foreground">{e.entidade}</span>
                        {e.entidade === "vaga" && e.entidade_id ? (
                          <Link to="/vaga/$id" params={{ id: e.entidade_id }} className="font-medium text-primary hover:underline">{e.entidade_nome}</Link>
                        ) : e.entidade === "setor" && e.entidade_id ? (
                          <Link to="/setor/$id" params={{ id: e.entidade_id }} className="font-medium text-primary hover:underline">{e.entidade_nome}</Link>
                        ) : (
                          <span className="font-medium">{e.entidade_nome}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.criado_em).toLocaleTimeString("pt-BR")} · {e.usuario_email ?? "sistema"}
                      </div>
                      {detalheTexto(e) && <div className="text-xs text-muted-foreground mt-0.5">{detalheTexto(e)}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
