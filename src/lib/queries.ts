import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Setor = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  criado_em: string;
};
export type Vaga = {
  id: string;
  setor_id: string;
  codigo: string;
  capacidade: number;
  observacoes: string | null;
  imagem_url: string | null;
  criado_em: string;
};
export type Caixa = {
  id: string;
  vaga_id: string;
  nome: string;
  quantidade: number;
  descricao: string | null;
  imagem_url: string | null;
  criado_em: string;
};
export type Movimentacao = {
  id: string;
  caixa_id: string;
  vaga_origem_id: string | null;
  vaga_destino_id: string | null;
  criado_em: string;
};

// ---------- SETORES ----------
export function useSetores() {
  return useQuery({
    queryKey: ["setores"],
    queryFn: async (): Promise<Setor[]> => {
      const { data, error } = await supabase
        .from("setores" as never)
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Setor[];
    },
  });
}

export function useSetor(id: string) {
  return useQuery({
    queryKey: ["setor", id],
    queryFn: async (): Promise<Setor | null> => {
      const { data, error } = await supabase
        .from("setores" as never)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Setor) ?? null;
    },
  });
}

export function useSaveSetor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Setor> & { nome: string }) => {
      if (input.id) {
        const { error } = await supabase
          .from("setores" as never)
          .update({
            nome: input.nome,
            descricao: input.descricao ?? null,
            imagem_url: input.imagem_url ?? null,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("setores" as never).insert({
          nome: input.nome,
          descricao: input.descricao ?? null,
          imagem_url: input.imagem_url ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["setores"] });
      qc.invalidateQueries({ queryKey: ["setor"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteSetor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("setores" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

// ---------- VAGAS ----------
export function useVagas(setorId?: string) {
  return useQuery({
    queryKey: ["vagas", setorId ?? "all"],
    queryFn: async (): Promise<Vaga[]> => {
      let q = supabase.from("vagas" as never).select("*").order("criado_em", { ascending: false });
      if (setorId) q = q.eq("setor_id", setorId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Vaga[];
    },
  });
}

export function useVaga(id: string) {
  return useQuery({
    queryKey: ["vaga", id],
    queryFn: async (): Promise<Vaga | null> => {
      const { data, error } = await supabase
        .from("vagas" as never)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Vaga) ?? null;
    },
  });
}

export function useSaveVaga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Vaga> & { setor_id: string; codigo: string; capacidade: number }) => {
      if (input.id) {
        const { error } = await supabase
          .from("vagas" as never)
          .update({
            codigo: input.codigo,
            capacidade: input.capacidade,
            observacoes: input.observacoes ?? null,
            imagem_url: input.imagem_url ?? null,
            setor_id: input.setor_id,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vagas" as never).insert({
          setor_id: input.setor_id,
          codigo: input.codigo,
          capacidade: input.capacidade,
          observacoes: input.observacoes ?? null,
          imagem_url: input.imagem_url ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteVaga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vagas" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ---------- CAIXAS ----------
export function useCaixas(vagaId?: string) {
  return useQuery({
    queryKey: ["caixas", vagaId ?? "all"],
    queryFn: async (): Promise<Caixa[]> => {
      let q = supabase.from("caixas" as never).select("*").order("criado_em", { ascending: false });
      if (vagaId) q = q.eq("vaga_id", vagaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Caixa[];
    },
  });
}

export function useSaveCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<Caixa> & { vaga_id: string; nome: string; quantidade: number },
    ) => {
      if (input.id) {
        const { error } = await supabase
          .from("caixas" as never)
          .update({
            nome: input.nome,
            quantidade: input.quantidade,
            descricao: input.descricao ?? null,
            imagem_url: input.imagem_url ?? null,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("caixas" as never).insert({
          vaga_id: input.vaga_id,
          nome: input.nome,
          quantidade: input.quantidade,
          descricao: input.descricao ?? null,
          imagem_url: input.imagem_url ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caixas" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useMoveCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      caixa,
      vagaDestinoId,
    }: {
      caixa: Caixa;
      vagaDestinoId: string;
    }) => {
      const origem = caixa.vaga_id;
      const { error: e1 } = await supabase
        .from("caixas" as never)
        .update({ vaga_id: vagaDestinoId })
        .eq("id", caixa.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("movimentacoes_caixa" as never).insert({
        caixa_id: caixa.id,
        vaga_origem_id: origem,
        vaga_destino_id: vagaDestinoId,
      });
      if (e2) throw e2;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ---------- DASHBOARD / SEARCH ----------
export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [s, v, c] = await Promise.all([
        supabase.from("setores" as never).select("id, nome"),
        supabase.from("vagas" as never).select("id, setor_id, capacidade"),
        supabase.from("caixas" as never).select("id, vaga_id, quantidade"),
      ]);
      if (s.error) throw s.error;
      if (v.error) throw v.error;
      if (c.error) throw c.error;
      return {
        setores: (s.data ?? []) as unknown as Pick<Setor, "id" | "nome">[],
        vagas: (v.data ?? []) as unknown as Pick<Vaga, "id" | "setor_id" | "capacidade">[],
        caixas: (c.data ?? []) as unknown as Pick<Caixa, "id" | "vaga_id" | "quantidade">[],
      };
    },
  });
}

export type SearchHit = {
  tipo: "setor" | "vaga" | "caixa";
  id: string;
  titulo: string;
  subtitulo?: string;
  path: string[]; // ["Mecânica", "Vaga A-05", "Caixa 12"]
  href: string;
};

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    enabled: query.trim().length > 0,
    queryFn: async (): Promise<SearchHit[]> => {
      const q = query.trim();
      const like = `%${q}%`;
      const [s, v, c] = await Promise.all([
        supabase
          .from("setores" as never)
          .select("id, nome, descricao")
          .or(`nome.ilike.${like},descricao.ilike.${like}`)
          .limit(20),
        supabase
          .from("vagas" as never)
          .select("id, codigo, observacoes, setor_id, setores:setor_id(nome)")
          .or(`codigo.ilike.${like},observacoes.ilike.${like}`)
          .limit(20),
        supabase
          .from("caixas" as never)
          .select(
            "id, nome, descricao, vaga_id, vagas:vaga_id(codigo, setor_id, setores:setor_id(nome))",
          )
          .or(`nome.ilike.${like},descricao.ilike.${like}`)
          .limit(20),
      ]);
      if (s.error) throw s.error;
      if (v.error) throw v.error;
      if (c.error) throw c.error;

      const hits: SearchHit[] = [];
      for (const row of (s.data ?? []) as unknown as Array<{
        id: string;
        nome: string;
        descricao: string | null;
      }>) {
        hits.push({
          tipo: "setor",
          id: row.id,
          titulo: row.nome,
          subtitulo: row.descricao ?? undefined,
          path: [row.nome],
          href: `/setor/${row.id}`,
        });
      }
      for (const row of (v.data ?? []) as unknown as Array<{
        id: string;
        codigo: string;
        observacoes: string | null;
        setor_id: string;
        setores: { nome: string } | null;
      }>) {
        hits.push({
          tipo: "vaga",
          id: row.id,
          titulo: `Vaga ${row.codigo}`,
          subtitulo: row.observacoes ?? undefined,
          path: [row.setores?.nome ?? "Setor", `Vaga ${row.codigo}`],
          href: `/vaga/${row.id}`,
        });
      }
      for (const row of (c.data ?? []) as unknown as Array<{
        id: string;
        nome: string;
        descricao: string | null;
        vaga_id: string;
        vagas: { codigo: string; setor_id: string; setores: { nome: string } | null } | null;
      }>) {
        hits.push({
          tipo: "caixa",
          id: row.id,
          titulo: row.nome,
          subtitulo: row.descricao ?? undefined,
          path: [
            row.vagas?.setores?.nome ?? "Setor",
            row.vagas ? `Vaga ${row.vagas.codigo}` : "Vaga",
            row.nome,
          ],
          href: `/vaga/${row.vaga_id}`,
        });
      }
      return hits;
    },
  });
}

// ---------- Helpers ----------
export function ocupacaoVaga(vagaId: string, caixas: Pick<Caixa, "vaga_id" | "quantidade">[]) {
  return caixas.filter((c) => c.vaga_id === vagaId).reduce((s, c) => s + c.quantidade, 0);
}

export type CapacityStatus = "livre" | "quase-cheia" | "lotada" | "sem-limite";
export function capacityStatus(ocupado: number, capacidade: number): CapacityStatus {
  if (capacidade <= 0) return "sem-limite";
  const pct = ocupado / capacidade;
  if (pct >= 1) return "lotada";
  if (pct >= 0.7) return "quase-cheia";
  return "livre";
}
