import { useQuery } from "@tanstack/react-query";
import { supabase as typedSupabase } from "@/integrations/supabase/client";

const sb = typedSupabase as unknown as { from: (t: string) => { select: (c: string) => any } };

export type Movimentacao = {
  id: string;
  criado_em: string;
  caixa: { nome: string } | null;
  origem: { codigo: string } | null;
  destino: { codigo: string } | null;
};

export function useKpisEstoque() {
  return useQuery({
    queryKey: ["kpis-estoque"],
    queryFn: async () => {
      let valorCusto = 0, ativos = 0, inativos = 0, semCusto = 0;
      const porSetor = new Map<string, number>();
      for (let i = 0; ; i += 1000) {
        const { data, error } = await sb
          .from("itens")
          .select("status, setor, custo_aquisicao")
          .order("id")
          .range(i, i + 999);
        if (error) throw error;
        for (const r of (data ?? []) as { status: string | null; setor: string | null; custo_aquisicao: number | null }[]) {
          if (r.status === "inativo") inativos++; else ativos++;
          if (r.custo_aquisicao == null) semCusto++; else valorCusto += Number(r.custo_aquisicao);
          const s = r.setor?.trim() || "Sem setor";
          porSetor.set(s, (porSetor.get(s) ?? 0) + 1);
        }
        if ((data ?? []).length < 1000) break;
      }
      const setores = Array.from(porSetor, ([nome, itens]) => ({ nome, itens })).sort((a, b) => b.itens - a.itens);
      const top = setores.slice(0, 8);
      const resto = setores.slice(8).reduce((a, s) => a + s.itens, 0);
      if (resto) top.push({ nome: "Outros", itens: resto });

      const { data: movs, error: e2 } = await sb
        .from("movimentacoes_caixa")
        .select("id, criado_em, caixa:caixas(nome), origem:vagas!movimentacoes_caixa_vaga_origem_id_fkey(codigo), destino:vagas!movimentacoes_caixa_vaga_destino_id_fkey(codigo)")
        .order("criado_em", { ascending: false })
        .limit(8);
      if (e2) throw e2;

      return { valorCusto, ativos, inativos, semCusto, setores: top, movimentacoes: (movs ?? []) as Movimentacao[] };
    },
  });
}
