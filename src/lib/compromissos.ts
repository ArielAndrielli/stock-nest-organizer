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

export const CATEGORIAS = ["producao", "manutencao", "reuniao", "entrega", "outro"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const CATEGORIA_ROTULO: Record<Categoria, string> = {
  producao: "Produção",
  manutencao: "Manutenção",
  reuniao: "Reunião",
  entrega: "Entrega",
  outro: "Outro",
};

export const CATEGORIA_CLASSE: Record<Categoria, string> = {
  producao: "bg-primary/10 text-primary border-primary/30",
  manutencao: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  reuniao: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  entrega: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  outro: "bg-muted text-muted-foreground border-border",
};

export const CATEGORIA_PONTO: Record<Categoria, string> = {
  producao: "bg-primary",
  manutencao: "bg-amber-500",
  reuniao: "bg-violet-500",
  entrega: "bg-emerald-500",
  outro: "bg-muted-foreground",
};

export function categoriaValida(c: string): Categoria {
  return (CATEGORIAS as readonly string[]).includes(c) ? (c as Categoria) : "outro";
}

export type Compromisso = {
  id: string;
  titulo: string;
  descricao: string | null;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
  local: string | null;
  categoria: string;
  ordem_id: string | null;
  criado_por: string | null;
  criado_por_email: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type CompromissoInput = {
  titulo: string;
  descricao?: string | null;
  inicio: string;
  fim?: string | null;
  dia_inteiro: boolean;
  local?: string | null;
  categoria: string;
  ordem_id?: string | null;
};

/** Lista compromissos com início dentro do intervalo [de, ate). */
export function useCompromissos(de: Date, ate: Date) {
  return useQuery({
    queryKey: ["compromissos", de.toISOString(), ate.toISOString()],
    queryFn: async (): Promise<Compromisso[]> => {
      const { data, error } = await sb
        .from("compromissos")
        .select("*")
        .gte("inicio", de.toISOString())
        .lt("inicio", ate.toISOString())
        .order("inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Compromisso[];
    },
  });
}

export function useCriarCompromisso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CompromissoInput) => {
      const { data: auth } = await typedSupabase.auth.getUser();
      const { data, error } = await sb
        .from("compromissos")
        .insert({
          ...input,
          criado_por: auth.user?.id ?? null,
          criado_por_email: auth.user?.email ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Compromisso;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compromissos"] }),
  });
}

export function useAtualizarCompromisso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CompromissoInput> & { id: string }) => {
      const { error } = await sb.from("compromissos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compromissos"] }),
  });
}

export function useExcluirCompromisso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("compromissos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compromissos"] }),
  });
}

/* ---------- helpers de data ---------- */

export function inicioDoMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function fimDoMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
export function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function chaveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Semanas (seg-dom) que cobrem o mês de `ref`. */
export function semanasDoMes(ref: Date): Date[][] {
  const primeiro = inicioDoMes(ref);
  const offset = (primeiro.getDay() + 6) % 7; // segunda = 0
  const inicio = new Date(primeiro.getFullYear(), primeiro.getMonth(), 1 - offset);
  const semanas: Date[][] = [];
  const cursor = new Date(inicio);
  for (let s = 0; s < 6; s++) {
    const semana: Date[] = [];
    for (let d = 0; d < 7; d++) {
      semana.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(semana);
  }
  return semanas;
}
export function horaCurta(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
export function dataLonga(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
/** Converte input datetime-local / date em ISO. */
export function paraIso(valor: string, diaInteiro: boolean) {
  if (!valor) return null;
  const d = diaInteiro ? new Date(`${valor}T00:00:00`) : new Date(valor);
  return d.toISOString();
}
/** ISO -> valor de input (datetime-local ou date). */
export function paraInput(iso: string | null, diaInteiro: boolean) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return diaInteiro ? base : `${base}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
