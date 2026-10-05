import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, ClipboardList, Layers, PackageOpen, PackagePlus } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { AgendaMes } from "@/components/calendario/AgendaMes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/lib/queries";
import { useKpisEstoque } from "@/lib/kpis";
import { ArrowRight, CircleCheck, CircleOff, Wallet } from "lucide-react";
import {
  STATUS_ORDEM, STATUS_ROTULO, TIPOS_MATERIAL, TIPO_MATERIAL_ROTULO, useOrdensStats,
} from "@/lib/ordens";


export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Estoque" },
      { name: "description", content: "Visão geral do estoque: setores, vagas, caixas e ocupação." },
      { property: "og:title", content: "Dashboard · Estoque" },
      { property: "og:description", content: "Indicadores de estoque, itens, ordens e movimentações." },
    ],
  }),
  component: Dashboard,
});

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold leading-tight">{value}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data, isLoading } = useDashboardData();
  if (isLoading || !data) {
    return (
      <AppShell>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </AppShell>
    );
  }

  const totalSetores = data.setores.length;
  const totalVagas = data.vagas.length;
  const totalCaixas = data.caixas.length;
  let vazias = 0, ocupadas = 0, somaCap = 0, somaOc = 0;
  const porSetor = new Map<string, { nome: string; caixas: number; ocupacao: number; capacidade: number }>();
  for (const s of data.setores) porSetor.set(s.id, { nome: s.nome, caixas: 0, ocupacao: 0, capacidade: 0 });

  for (const v of data.vagas) {
    const oc = data.caixas.filter((c) => c.vaga_id === v.id).reduce((a, c) => a + c.quantidade, 0);
    if (oc === 0) vazias++; else ocupadas++;
    if (v.capacidade > 0) { somaCap += v.capacidade; somaOc += Math.min(oc, v.capacidade); }
    const b = porSetor.get(v.setor_id);
    if (b) { b.ocupacao += oc; b.capacidade += v.capacidade; }
  }
  for (const c of data.caixas) {
    const vaga = data.vagas.find((vv) => vv.id === c.vaga_id);
    if (!vaga) continue;
    const b = porSetor.get(vaga.setor_id);
    if (b) b.caixas += 1;
  }

  const pctOcupacao = somaCap > 0 ? Math.round((somaOc / somaCap) * 100) : 0;
  const chartData = Array.from(porSetor.values()).map((b) => ({
    nome: b.nome, caixas: b.caixas,
    ocupacao: b.capacidade > 0 ? Math.round((b.ocupacao / b.capacidade) * 100) : 0,
  }));
  const statusData = [
    { name: "Livres", value: vazias, fill: "hsl(142 71% 45%)" },
    { name: "Ocupadas", value: ocupadas, fill: "hsl(217 91% 60%)" },
  ];

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu estoque em tempo real.</p>
        </div>
        <Link to="/setores" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          <PackagePlus className="h-4 w-4" /> Gerenciar setores
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Layers className="h-5 w-5" />} label="Setores" value={totalSetores} />
        <Stat icon={<Boxes className="h-5 w-5" />} label="Vagas" value={totalVagas} hint={`${vazias} vazias · ${ocupadas} ocupadas`} />
        <Stat icon={<PackageOpen className="h-5 w-5" />} label="Caixas" value={totalCaixas} />
        <Stat icon={<PackageOpen className="h-5 w-5" />} label="Ocupação total" value={`${pctOcupacao}%`} hint={somaCap > 0 ? `${somaOc} / ${somaCap} unidades` : "Sem capacidade definida"} />
      </div>

      <KpisItens />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in">
          <CardHeader><CardTitle>Ocupação por setor (%)</CardTitle></CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre setores e vagas.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="ocupacao" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="animate-fade-in">
          <CardHeader><CardTitle>Caixas por setor</CardTitle></CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="caixas" fill="hsl(142 71% 45%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {totalVagas > 0 && (
        <div className="mt-6">
          <Card className="animate-fade-in">
            <CardHeader><CardTitle>Vagas livres vs ocupadas</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                    {statusData.map((s, i) => <Cell key={i} fill={s.fill} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <AgendaMes />

      <OrdensStats />
    </AppShell>
  );
}

const CORES_STATUS: Record<string, string> = {
  aguardando_separacao: "hsl(215 16% 60%)",
  em_separacao: "hsl(217 91% 60%)",
  separacao_concluida: "hsl(160 84% 39%)",
  concluido: "hsl(142 71% 45%)",
  cancelado: "hsl(0 84% 60%)",
};

function OrdensStats() {
  const { data, isLoading } = useOrdensStats();
  if (isLoading || !data) {
    return <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </div>;
  }

  const { ordens, materiais } = data;
  const total = ordens.length;
  const emAberto = ordens.filter((o) => o.status === "aguardando_separacao" || o.status === "em_separacao").length;
  const concluidas = ordens.filter((o) => o.status === "concluido").length;
  const canceladas = ordens.filter((o) => o.status === "cancelado").length;

  const porStatus = STATUS_ORDEM.map((s) => ({
    name: STATUS_ROTULO[s],
    value: ordens.filter((o) => o.status === s).length,
    fill: CORES_STATUS[s],
  })).filter((d) => d.value > 0);

  const meses: { nome: string; ordens: number }[] = [];
  const hoje = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const nome = d.toLocaleDateString("pt-BR", { month: "short" });
    const qtd = ordens.filter((o) => {
      const c = new Date(o.criado_em);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    meses.push({ nome, ordens: qtd });
  }

  const porTipo = TIPOS_MATERIAL.map((t) => ({
    nome: TIPO_MATERIAL_ROTULO[t],
    quantidade: materiais
      .filter((m) => m.tipo_material === t)
      .reduce((a, m) => a + Number(m.quantidade || 0), 0),
  })).filter((d) => d.quantidade > 0);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Ordens de produção</h2>
          <p className="text-sm text-muted-foreground">Estatísticas de produção e materiais requisitados.</p>
        </div>
        <Link to="/ordens" className="text-sm font-medium text-primary hover:underline">Ver ordens</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<ClipboardList className="h-5 w-5" />} label="Total de ordens" value={total} />
        <Stat icon={<ClipboardList className="h-5 w-5" />} label="Em aberto" value={emAberto} hint="Aguardando + em separação" />
        <Stat icon={<ClipboardList className="h-5 w-5" />} label="Concluídas" value={concluidas} />
        <Stat icon={<ClipboardList className="h-5 w-5" />} label="Canceladas" value={canceladas} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in">
          <CardHeader><CardTitle>Ordens por status</CardTitle></CardHeader>
          <CardContent className="h-72">
            {porStatus.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ordem cadastrada.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                    {porStatus.map((s, i) => <Cell key={i} fill={s.fill} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="animate-fade-in">
          <CardHeader><CardTitle>Ordens criadas por mês</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="ordens" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="animate-fade-in">
          <CardHeader><CardTitle>Materiais requisitados por tipo</CardTitle></CardHeader>
          <CardContent className="h-72">
            {porTipo.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum material vinculado a ordens.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porTipo}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="hsl(142 71% 45%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}


const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function KpisItens() {
  const { data, isLoading, error } = useKpisEstoque();
  if (error) return <p className="mt-6 text-sm text-destructive">Não foi possível carregar os indicadores de itens.</p>;
  if (isLoading || !data) {
    return <div className="mt-6 grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }
  const total = data.ativos + data.inativos;
  return (
    <section className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Wallet className="h-5 w-5" />} label="Valor em estoque (custo)" value={brl(data.valorCusto)}
          hint={data.semCusto ? `${data.semCusto.toLocaleString("pt-BR")} itens sem custo informado` : "Soma do custo de aquisição"} />
        <Stat icon={<CircleCheck className="h-5 w-5" />} label="Itens ativos" value={data.ativos.toLocaleString("pt-BR")}
          hint={total ? `${Math.round((data.ativos / total) * 100)}% do cadastro` : undefined} />
        <Stat icon={<CircleOff className="h-5 w-5" />} label="Itens inativos" value={data.inativos.toLocaleString("pt-BR")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in">
          <CardHeader><CardTitle>Itens por setor</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.setores.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.setores} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="itens" fill="hsl(217 91% 60%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Movimentações recentes</CardTitle>
            <Link to="/historico" className="text-sm font-medium text-primary hover:underline">Ver histórico</Link>
          </CardHeader>
          <CardContent>
            {data.movimentacoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p> : (
              <ul className="divide-y">
                {data.movimentacoes.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{m.caixa?.nome ?? "Caixa"}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {m.origem?.codigo ?? "—"} <ArrowRight className="h-3 w-3" /> {m.destino?.codigo ?? "—"}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(m.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
