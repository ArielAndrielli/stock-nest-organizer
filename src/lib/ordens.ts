import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as typedSupabase } from "@/integrations/supabase/client";

const sb = typedSupabase as unknown as {
  from: (t: string) => {
    select: (cols?: string, opts?: unknown) => any;
    insert: (v: unknown) => any;
    update: (v: unknown) => any;
    delete: () => any;
  };
};

export const STATUS_ORDEM = [
  "aguardando_separacao",
  "em_separacao",
  "separacao_concluida",
  "concluido",
  "cancelado",
] as const;
export type StatusOrdem = (typeof STATUS_ORDEM)[number];

export const STATUS_ROTULO: Record<StatusOrdem, string> = {
  aguardando_separacao: "Aguardando separação",
  em_separacao: "Em separação",
  separacao_concluida: "Separação concluída",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const STATUS_CLASSE: Record<StatusOrdem, string> = {
  aguardando_separacao: "bg-muted text-muted-foreground",
  em_separacao: "bg-primary/10 text-primary",
  separacao_concluida: "bg-emerald-500/10 text-emerald-600",
  concluido: "bg-emerald-600 text-white",
  cancelado: "bg-destructive/10 text-destructive",
};

export const TIPOS_MATERIAL = [
  "cartao",
  "embalagem",
  "etiqueta",
  "adesivo",
  "materia_prima",
  "caixa",
] as const;
export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];

export const TIPO_MATERIAL_ROTULO: Record<TipoMaterial, string> = {
  cartao: "Cartão",
  embalagem: "Embalagem",
  etiqueta: "Etiqueta",
  adesivo: "Adesivo",
  materia_prima: "Matéria-prima",
  caixa: "Caixa",
};

export type OrdemItem = {
  id: string;
  ordem_id: string;
  item_id: string | null;
  tipo_material: string;
  referencia: string | null;
  descricao: string | null;
  quantidade: number;
};

export type Ordem = {
  id: string;
  numero: string;
  referencia: string;
  descricao: string;
  quantidade: number;
  status: StatusOrdem;
  observacoes: string | null;
  imagem_url: string | null;
  criado_por: string | null;
  criado_por_email: string | null;
  criado_em: string;
  atualizado_em: string;
  ordem_itens?: OrdemItem[];
};

export function useOrdens(q: string, status: string) {
  return useQuery({
    queryKey: ["ordens", q, status],
    queryFn: async (): Promise<Ordem[]> => {
      let query = sb.from("ordens_producao").select("*, ordem_itens(*)");
      const termo = q.trim();
      if (termo) {
        const like = `%${termo.replace(/[%,]/g, " ")}%`;
        query = query.or(`numero.ilike.${like},referencia.ilike.${like},descricao.ilike.${like}`);
      }
      if (status) query = query.eq("status", status);
      const { data, error } = await query.order("numero", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ordem[];
    },
  });
}


export function useOrdem(id: string) {
  return useQuery({
    queryKey: ["ordem", id],
    queryFn: async (): Promise<Ordem | null> => {
      const { data, error } = await sb
        .from("ordens_producao")
        .select("*, ordem_itens(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Ordem | null;
    },
  });
}

export type NovoMaterial = {
  item_id: string | null;
  tipo_material: string;
  referencia: string | null;
  descricao: string | null;
  quantidade: number;
};

export function useCriarOrdem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      numero: string;
      referencia: string;
      descricao: string;
      quantidade: number;
      observacoes?: string;
      imagem_url?: string | null;
      materiais: NovoMaterial[];
    }) => {
      const { data: sessao } = await typedSupabase.auth.getUser();
      const user = sessao.user;
      const { data, error } = await sb
        .from("ordens_producao")
        .insert({
          numero: input.numero,
          referencia: input.referencia,
          descricao: input.descricao,
          quantidade: input.quantidade,
          observacoes: input.observacoes || null,
          imagem_url: input.imagem_url ?? null,
          criado_por: user?.id ?? null,
          criado_por_email: user?.email ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const ordemId = (data as { id: string }).id;
      if (input.materiais.length > 0) {
        const { error: e2 } = await sb
          .from("ordem_itens")
          .insert(input.materiais.map((m) => ({ ...m, ordem_id: ordemId })));
        if (e2) throw e2;
      }
      return ordemId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens"] }),
  });
}

export function useAtualizarOrdem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await sb.from("ordens_producao").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["ordem", v.id] });
      qc.invalidateQueries({ queryKey: ["ordens-stats"] });
    },
  });
}

export function useOrdensStats() {
  return useQuery({
    queryKey: ["ordens-stats"],
    queryFn: async () => {
      const [o, m] = await Promise.all([
        sb.from("ordens_producao").select("status, criado_em, quantidade"),
        sb.from("ordem_itens").select("tipo_material, quantidade"),
      ]);
      if (o.error) throw o.error;
      if (m.error) throw m.error;
      return {
        ordens: (o.data ?? []) as { status: StatusOrdem; criado_em: string; quantidade: number }[],
        materiais: (m.data ?? []) as { tipo_material: string; quantidade: number }[],
      };
    },
  });
}

export function useAtualizarStatus() {

  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusOrdem }) => {
      const { error } = await sb.from("ordens_producao").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["ordem", v.id] });
    },
  });
}

export function useExcluirOrdem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("ordens_producao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens"] }),
  });
}

export function useAtualizarMateriais() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ordemId, materiais }: { ordemId: string; materiais: NovoMaterial[] }) => {
      const { error } = await sb.from("ordem_itens").delete().eq("ordem_id", ordemId);
      if (error) throw error;
      if (materiais.length > 0) {
        const { error: e2 } = await sb
          .from("ordem_itens")
          .insert(materiais.map((m) => ({ ...m, ordem_id: ordemId })));
        if (e2) throw e2;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["ordem", v.ordemId] });
    },
  });
}

export async function proximoNumeroOrdem(): Promise<string> {
  const { data } = await sb
    .from("ordens_producao")
    .select("numero")
    .order("criado_em", { ascending: false })
    .limit(50);
  const nums = ((data ?? []) as { numero: string }[])
    .map((r) => Number(String(r.numero).replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  const prox = (nums.length ? Math.max(...nums) : 0) + 1;
  return `OP-${String(prox).padStart(5, "0")}`;
}
