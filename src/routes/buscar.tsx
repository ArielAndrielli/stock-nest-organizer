import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useGlobalSearch } from "@/lib/queries";

const searchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Buscar · Estoque" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuscarPage,
});

function BuscarPage() {
  const { q } = Route.useSearch();
  const { data, isFetching } = useGlobalSearch(q);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Resultados para “{q}”</h1>
      <p className="text-sm text-muted-foreground">
        {isFetching ? "Buscando…" : `${data?.length ?? 0} resultado(s)`}
      </p>

      <div className="mt-6 space-y-2">
        {isFetching &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}

        {!isFetching && data && data.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center animate-fade-in">
            <p className="font-medium">Nenhum resultado encontrado</p>
            <p className="text-sm text-muted-foreground">Tente outro termo.</p>
          </div>
        )}

        {!isFetching &&
          data?.map((h) => (
            <Link
              key={`${h.tipo}-${h.id}`}
              to={h.href}
              className="block rounded-xl border bg-card p-4 shadow-sm transition-all duration-[250ms] hover:scale-[1.01] hover:shadow-md animate-fade-in"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {h.tipo}
                </span>
                <span className="font-medium">{h.titulo}</span>
              </div>
              <div className="text-xs text-muted-foreground">{h.path.join(" → ")}</div>
              {h.subtitulo && <div className="mt-1 text-sm text-muted-foreground">{h.subtitulo}</div>}
            </Link>
          ))}
      </div>
    </AppShell>
  );
}
