import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, Layers, PackageOpen, PackagePlus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData, capacityStatus } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Estoque" },
      { name: "description", content: "Visão geral do estoque: setores, vagas, caixas e ocupação." },
    ],
  }),
  component: Dashboard,
});

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
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
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  const totalSetores = data.setores.length;
  const totalVagas = data.vagas.length;
  const totalCaixas = data.caixas.length;

  let vazias = 0;
  let ocupadas = 0;
  let somaCap = 0;
  let somaOc = 0;

  const setorMap = new Map(data.setores.map((s) => [s.id, s.nome]));
  const porSetor = new Map<string, { nome: string; caixas: number; ocupacao: number; capacidade: number }>();
  for (const s of data.setores) porSetor.set(s.id, { nome: s.nome, caixas: 0, ocupacao: 0, capacidade: 0 });

  for (const v of data.vagas) {
    const oc = data.caixas.filter((c) => c.vaga_id === v.id).reduce((a, c) => a + c.quantidade, 0);
    if (oc === 0) vazias++;
    else ocupadas++;
    if (v.capacidade > 0) {
      somaCap += v.capacidade;
      somaOc += Math.min(oc, v.capacidade);
    }
    const bucket = porSetor.get(v.setor_id);
    if (bucket) {
      bucket.ocupacao += oc;
      bucket.capacidade += v.capacidade;
    }
  }
  for (const c of data.caixas) {
    const vaga = data.vagas.find((vv) => vv.id === c.vaga_id);
    if (!vaga) continue;
    const b = porSetor.get(vaga.setor_id);
    if (b) b.caixas += 1;
  }

  const pctOcupacao = somaCap > 0 ? Math.round((somaOc / somaCap) * 100) : 0;

  const chartData = Array.from(porSetor.values()).map((b) => ({
    nome: b.nome,
    caixas: b.caixas,
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
        <Link
          to="/setores"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <PackagePlus className="h-4 w-4" /> Gerenciar setores
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Layers className="h-5 w-5" />} label="Setores" value={totalSetores} />
        <Stat icon={<Boxes className="h-5 w-5" />} label="Vagas" value={totalVagas} hint={`${vazias} vazias · ${ocupadas} ocupadas`} />
        <Stat icon={<PackageOpen className="h-5 w-5" />} label="Caixas" value={totalCaixas} />
        <Stat
          icon={<PackageOpen className="h-5 w-5" />}
          label="Ocupação total"
          value={`${pctOcupacao}%`}
          hint={somaCap > 0 ? `${somaOc} / ${somaCap} unidades` : "Sem capacidade definida"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Ocupação por setor (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cadastre setores e vagas para ver o gráfico.</p>
            ) : (
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
          <CardHeader>
            <CardTitle>Caixas por setor</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
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
            <CardHeader>
              <CardTitle>Vagas livres vs ocupadas</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                    {statusData.map((s, i) => (
                      <Cell key={i} fill={s.fill} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
      {/* placeholder to keep capacityStatus/setorMap referenced */}
      <span className="hidden">{capacityStatus(0, 0)}{setorMap.size}</span>
    </AppShell>
  );
}
