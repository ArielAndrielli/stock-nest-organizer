import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CATEGORIA_PONTO,
  CATEGORIA_ROTULO,
  categoriaValida,
  chaveDia,
  fimDoMes,
  horaCurta,
  inicioDoMes,
  mesmoDia,
  semanasDoMes,
  useCompromissos,
} from "@/lib/compromissos";

const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function AgendaMes() {
  const hoje = new Date();
  const de = inicioDoMes(hoje);
  const ate = fimDoMes(hoje);
  const { data: compromissos, isLoading } = useCompromissos(de, ate);

  const porDia = new Map<string, number>();
  for (const c of compromissos ?? []) {
    const k = chaveDia(new Date(c.inicio));
    porDia.set(k, (porDia.get(k) ?? 0) + 1);
  }

  const semanas = semanasDoMes(hoje);
  const nomeMes = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Agenda do mês</h2>
          <p className="text-sm text-muted-foreground capitalize">{nomeMes}</p>
        </div>
        <Link to="/calendario" className="text-sm font-medium text-primary hover:underline">
          Ver calendário
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Mês atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {DIAS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {semanas.flat().map((d) => {
                const doMes = d.getMonth() === hoje.getMonth();
                const qtd = porDia.get(chaveDia(d)) ?? 0;
                return (
                  <Link
                    key={d.toISOString()}
                    to="/calendario"
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-md text-xs transition-colors hover:bg-accent",
                      !doMes && "opacity-35",
                      mesmoDia(d, hoje) && "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    <span>{d.getDate()}</span>
                    <span className="mt-0.5 h-1 w-1 rounded-full">
                      {qtd > 0 && (
                        <span className={cn("block h-1 w-1 rounded-full", mesmoDia(d, hoje) ? "bg-primary-foreground" : "bg-primary")} />
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader><CardTitle className="text-base">Compromissos do mês</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : !compromissos || compromissos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum compromisso agendado neste mês.</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-auto pr-1">
                {compromissos.map((c) => {
                  const cat = categoriaValida(c.categoria);
                  const d = new Date(c.inicio);
                  return (
                    <li key={c.id}>
                      <Link
                        to="/calendario"
                        className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                      >
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", CATEGORIA_PONTO[cat])} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{c.titulo}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            {!c.dia_inteiro && ` · ${horaCurta(c.inicio)}`}
                            {` · ${CATEGORIA_ROTULO[cat]}`}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
