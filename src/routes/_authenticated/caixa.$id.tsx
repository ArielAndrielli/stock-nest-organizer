import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Barcode } from "@/components/QrCode";
import { supabase } from "@/integrations/supabase/client";
import type { Caixa } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/caixa/$id")({
  head: () => ({ meta: [{ title: "Caixa · Estoque" }, { name: "robots", content: "noindex" }] }),
  component: CaixaDetail,
});

function CaixaDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["caixa-detail", id],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data, error } = await sb
        .from("caixas")
        .select("*, vagas:vaga_id(id, codigo, setor_id, setores:setor_id(id, nome))")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as (Caixa & { vagas: { id: string; codigo: string; setor_id: string; setores: { id: string; nome: string } | null } | null }) | null;
    },
  });

  const url = typeof window !== "undefined" ? `${window.location.origin}/caixa/${id}` : "";

  if (isLoading) return <AppShell><Skeleton className="h-64" /></AppShell>;
  if (!data) return <AppShell><div className="rounded-2xl border border-dashed p-12 text-center">Caixa não encontrada.</div></AppShell>;

  return (
    <AppShell>
      {data.vagas && (
        <Link to="/vaga/$id" params={{ id: data.vagas.id }} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Vaga {data.vagas.codigo}
        </Link>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="animate-fade-in">
          <div className="aspect-[16/10] w-full overflow-hidden rounded-t-lg bg-muted">
            {data.imagem_url ? (
              <img src={data.imagem_url} alt={data.nome} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center"><Package className="h-16 w-16 text-muted-foreground/40" /></div>
            )}
          </div>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold">{data.nome}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>Quantidade: <b className="text-foreground">{data.quantidade}</b></span>
              {data.vagas && <span>· Vaga <b className="text-foreground">{data.vagas.codigo}</b></span>}
              {data.vagas?.setores && <span>· Setor <b className="text-foreground">{data.vagas.setores.nome}</b></span>}
            </div>
            {data.descricao && <p className="mt-4 text-sm">{data.descricao}</p>}
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <div className="text-sm font-semibold">QR Code</div>
            <QrCode value={url} size={200} />
            <div className="w-full">
              <div className="mb-1 text-center text-xs text-muted-foreground">Código de barras</div>
              <div className="flex justify-center"><Barcode value={data.id.slice(0, 20)} /></div>
            </div>
            <Link to="/etiquetas" className="text-sm text-primary hover:underline">Imprimir etiqueta</Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
