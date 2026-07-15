import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as typedSupabase } from "@/integrations/supabase/client";

// Types gerados ainda não conhecem as tabelas novas — usamos client destipado.
const sb = typedSupabase as unknown as {
  from: (t: string) => {
    select: (cols?: string) => any;
    insert: (v: unknown) => any;
    update: (v: unknown) => any;
    delete: () => any;
  };
};

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

// ---------- SETORES ----------
export function useSetores() {
  return useQuery({
    queryKey: ["setores"],
    queryFn: async (): Promise<Setor[]> => {
      const { data, error } = await sb.from("setores").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Setor[];
    },
  });
}

export function useSetor(id: string) {
  return useQuery({
    queryKey: ["setor", id],
    enabled: !!id,
    queryFn: async (): Promise<Setor | null> => {
      const { data, error } = await sb.from("setores").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as Setor) ?? null;
    },
  });
}

export function useSaveSetor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Setor> & { nome: string }) => {
      const payload = {
        nome: input.nome,
        descricao: input.descricao ?? null,
        imagem_url: input.imagem_url ?? null,
      };
      if (input.id) {
        const { error } = await sb.from("setores").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("setores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteSetor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("setores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ---------- VAGAS ----------
export function useVagas(setorId?: string) {
  return useQuery({
    queryKey: ["vagas", setorId ?? "all"],
    queryFn: async (): Promise<Vaga[]> => {
      let q = sb.from("vagas").select("*").order("criado_em", { ascending: false });
      if (setorId) q = q.eq("setor_id", setorId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Vaga[];
    },
  });
}

export function useVaga(id: string) {
  return useQuery({
    queryKey: ["vaga", id],
    enabled: !!id,
    queryFn: async (): Promise<Vaga | null> => {
      const { data, error } = await sb.from("vagas").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as Vaga) ?? null;
    },
  });
}

export function useSaveVaga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<Vaga> & { setor_id: string; codigo: string; capacidade: number },
    ) => {
      const payload = {
        setor_id: input.setor_id,
        codigo: input.codigo,
        capacidade: input.capacidade,
        observacoes: input.observacoes ?? null,
        imagem_url: input.imagem_url ?? null,
      };
      if (input.id) {
        const { error } = await sb.from("vagas").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("vagas").insert(payload);
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
      const { error } = await sb.from("vagas").delete().eq("id", id);
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
      let q = sb.from("caixas").select("*").order("criado_em", { ascending: false });
      if (vagaId) q = q.eq("vaga_id", vagaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Caixa[];
    },
  });
}

export function useSaveCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<Caixa> & { vaga_id: string; nome: string; quantidade: number },
    ) => {
      const payload = {
        vaga_id: input.vaga_id,
        nome: input.nome,
        quantidade: input.quantidade,
        descricao: input.descricao ?? null,
        imagem_url: input.imagem_url ?? null,
      };
      if (input.id) {
        const { error } = await sb
          .from("caixas")
          .update({
            nome: payload.nome,
            quantidade: payload.quantidade,
            descricao: payload.descricao,
            imagem_url: payload.imagem_url,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("caixas").insert(payload);
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
      const { error } = await sb.from("caixas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useMoveCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ caixa, vagaDestinoId }: { caixa: Caixa; vagaDestinoId: string }) => {
      const origem = caixa.vaga_id;
      const { error: e1 } = await sb
        .from("caixas")
        .update({ vaga_id: vagaDestinoId })
        .eq("id", caixa.id);
      if (e1) throw e1;
      const { error: e2 } = await sb.from("movimentacoes_caixa").insert({
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
        sb.from("setores").select("id, nome"),
        sb.from("vagas").select("id, setor_id, capacidade"),
        sb.from("caixas").select("id, vaga_id, quantidade"),
      ]);
      if (s.error) throw s.error;
      if (v.error) throw v.error;
      if (c.error) throw c.error;
      return {
        setores: (s.data ?? []) as { id: string; nome: string }[],
        vagas: (v.data ?? []) as { id: string; setor_id: string; capacidade: number }[],
        caixas: (c.data ?? []) as { id: string; vaga_id: string; quantidade: number }[],
      };
    },
  });
}

export type SearchHit = {
  tipo: "setor" | "vaga" | "caixa";
  id: string;
  titulo: string;
  subtitulo?: string;
  path: string[];
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
        sb
          .from("setores")
          .select("id, nome, descricao")
          .or(`nome.ilike.${like},descricao.ilike.${like}`)
          .limit(20),
        sb
          .from("vagas")
          .select("id, codigo, observacoes, setor_id, setores:setor_id(nome)")
          .or(`codigo.ilike.${like},observacoes.ilike.${like}`)
          .limit(20),
        sb
          .from("caixas")
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
      for (const row of (s.data ?? []) as Array<{
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
      for (const row of (v.data ?? []) as Array<{
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
      for (const row of (c.data ?? []) as Array<{
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
export function ocupacaoVaga(vagaId: string, caixas: { vaga_id: string; quantidade: number }[]) {
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

export function statusLabel(s: CapacityStatus): { label: string; color: string; dot: string } {
  switch (s) {
    case "livre":
      return { label: "Livre", color: "text-emerald-700 bg-emerald-100", dot: "bg-emerald-500" };
    case "quase-cheia":
      return { label: "Quase cheia", color: "text-amber-700 bg-amber-100", dot: "bg-amber-500" };
    case "lotada":
      return { label: "Lotada", color: "text-rose-700 bg-rose-100", dot: "bg-rose-500" };
    default:
      return { label: "Sem limite", color: "text-muted-foreground bg-muted", dot: "bg-muted-foreground" };
  }
}

// ---------- HISTORICO ----------
export type HistoricoEvento = {
  id: string;
  criado_em: string;
  usuario_id: string | null;
  usuario_email: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  entidade_nome: string | null;
  detalhes: unknown;
};

export function useHistorico() {
  return useQuery({
    queryKey: ["historico"],
    queryFn: async (): Promise<HistoricoEvento[]> => {
      const { data, error } = await sb
        .from("historico_eventos")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HistoricoEvento[];
    },
  });
}

// ---------- USUARIOS ----------
export type UserRow = {
  id: string;
  email: string | null;
  nome_exibicao: string | null;
  role: "administrador" | "operador" | "visitante";
};

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async (): Promise<UserRow[]> => {
      const [{ data: profs, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        sb.from("profiles").select("id, email, nome_exibicao"),
        sb.from("user_roles").select("user_id, role"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const rank = { administrador: 3, operador: 2, visitante: 1 } as const;
      const map = new Map<string, UserRow["role"]>();
      for (const r of (roles ?? []) as { user_id: string; role: UserRow["role"] }[]) {
        const cur = map.get(r.user_id);
        if (!cur || rank[r.role] > rank[cur]) map.set(r.user_id, r.role);
      }
      return ((profs ?? []) as { id: string; email: string | null; nome_exibicao: string | null }[]).map((p) => ({
        ...p,
        role: map.get(p.id) ?? "visitante",
      }));
    },
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRow["role"] }) => {
      const { error: eDel } = await sb.from("user_roles").delete().eq("user_id", userId);
      if (eDel) throw eDel;
      const { error } = await sb.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}
