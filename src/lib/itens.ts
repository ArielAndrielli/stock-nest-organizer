import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const sb = typedSupabase as unknown as {
  from: (t: string) => {
    select: (cols?: string, opts?: unknown) => any;
    insert: (v: unknown) => any;
    upsert: (v: unknown, o?: unknown) => any;
    update: (v: unknown) => any;
    delete: () => any;
  };
};

export const CAMPOS_FIXOS = [
  "codigo_interno",
  "referencia",
  "descricao",
  "marca",
  "setor",
  "tipo_item",
  "status",
  "imagem_url",
  "unidade_medida",
  "codigo_barras",
  "fornecedor_id",
  "custo_aquisicao",
  "preco_venda",
  "estoque_minimo",
  "estoque_maximo",
  "deposito",
  "corredor",
  "prateleira",
] as const;

export const UNIDADES = ["UN", "KG", "G", "CX", "PCT", "L", "ML", "M", "M²", "RL", "PR"];
export const CAMPOS_MOEDA = ["custo_aquisicao", "preco_venda"];
const SELECT_ITEM = "*, fornecedor:fornecedores(id, codigo, razao_social, nome_fantasia)";
export type CampoFixo = (typeof CAMPOS_FIXOS)[number];

export const COLUNAS_PADRAO = ["codigo_interno", "referencia", "descricao", "marca", "setor"];

export type Item = {
  id: string;
  codigo_interno: number;
  referencia: string | null;
  descricao: string | null;
  marca: string | null;
  setor: string | null;
  tipo_item: string | null;
  status: string | null;
  imagem_url: string | null;
  unidade_medida: string | null;
  codigo_barras: string | null;
  fornecedor_id: string | null;
  fornecedor?: { id: string; codigo: number | null; razao_social: string | null; nome_fantasia: string | null } | null;
  custo_aquisicao: number | null;
  preco_venda: number | null;
  estoque_minimo: number | null;
  estoque_maximo: number | null;
  deposito: string | null;
  corredor: string | null;
  prateleira: string | null;
  extras: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
};

export type ItemCampo = {
  id: string;
  chave: string;
  rotulo: string;
  tipo: string;
  fixo: boolean;
  filtravel: boolean;
  visivel_padrao: boolean;
  ordem: number;
};

export type Prefs = {
  colunas_visiveis: string[];
  ordem_colunas: string[];
  modo_visualizacao: "grid" | "cards";
  por_pagina: number;
};

export const PREFS_PADRAO: Prefs = {
  colunas_visiveis: COLUNAS_PADRAO,
  ordem_colunas: [],
  modo_visualizacao: "grid",
  por_pagina: 25,
};

export const OPCOES_POR_PAGINA = [10, 25, 50, 100, 200];


export function isFixo(chave: string) {
  return (CAMPOS_FIXOS as readonly string[]).includes(chave);
}

export function valorCampo(item: Item, chave: string): unknown {
  if (chave === "fornecedor_id") {
    const f = item.fornecedor;
    return f ? `${f.codigo ?? ""} - ${f.razao_social ?? f.nome_fantasia ?? ""}`.replace(/^ - /, "") : null;
  }
  if (chave === "status") {
    const st = item.status;
    return st === "inativo" ? "Inativo" : st === "ativo" ? "Ativo" : st;
  }
  if (CAMPOS_MOEDA.includes(chave)) {
    const v = (item as unknown as Record<string, unknown>)[chave];
    return v === null || v === undefined ? null : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (isFixo(chave)) return (item as unknown as Record<string, unknown>)[chave];
  return item.extras?.[chave];
}

export function formatarValor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ---------- CAMPOS ----------
export function useItemCampos() {
  return useQuery({
    queryKey: ["item-campos"],
    queryFn: async (): Promise<ItemCampo[]> => {
      const { data, error } = await sb
        .from("item_campos")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemCampo[];
    },
  });
}

export function useCriarCampos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campos: Array<{ chave: string; rotulo: string }>) => {
      if (campos.length === 0) return;
      const payload = campos.map((c, i) => ({
        chave: c.chave,
        rotulo: c.rotulo,
        tipo: "texto",
        fixo: false,
        filtravel: false,
        visivel_padrao: false,
        ordem: 100 + i,
      }));
      const { error } = await sb.from("item_campos").upsert(payload, { onConflict: "chave" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["item-campos"] }),
  });
}

// ---------- PREFERENCIAS ----------
export function usePrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["item-prefs", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Prefs> => {
      const { data, error } = await sb
        .from("item_preferencias")
        .select("colunas_visiveis, ordem_colunas, modo_visualizacao, por_pagina")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return PREFS_PADRAO;
      return { ...PREFS_PADRAO, ...(data as Partial<Prefs>) };
    },
  });
}

export function useSavePrefs() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<Prefs>) => {
      if (!user) throw new Error("Sessão expirada.");
      const atual = (qc.getQueryData(["item-prefs", user.id]) as Prefs | undefined) ?? PREFS_PADRAO;
      const next = { ...atual, ...patch };
      qc.setQueryData(["item-prefs", user.id], next);
      const { error } = await sb
        .from("item_preferencias")
        .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
      if (error) throw error;
      return next;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["item-prefs"] }),
  });
}


// ---------- LISTAGEM ----------
export type ItensQueryArgs = {
  q: string;
  filtros: Record<string, string>;
  ordenarPor: string;
  ordem: "asc" | "desc";
  pagina: number;
  porPagina: number;
};

type FiltroArgs = Pick<ItensQueryArgs, "q" | "filtros" | "ordenarPor" | "ordem">;

function montarQuery(args: FiltroArgs, contar: boolean) {
  let query = contar
    ? sb.from("itens").select(SELECT_ITEM, { count: "exact" })
    : sb.from("itens").select(SELECT_ITEM);

  const termo = args.q.trim();
  if (termo) {
    const like = `%${termo.replace(/[%,]/g, " ")}%`;
    const ors = [
      `referencia.ilike.${like}`,
      `descricao.ilike.${like}`,
      `marca.ilike.${like}`,
      `setor.ilike.${like}`,
      `tipo_item.ilike.${like}`,
      `status.ilike.${like}`,
      `codigo_barras.ilike.${like}`,
      `deposito.ilike.${like}`,
    ];
    if (/^\d+$/.test(termo)) ors.push(`codigo_interno.eq.${termo}`);
    query = query.or(ors.join(","));
  }

  for (const [chave, valor] of Object.entries(args.filtros)) {
    if (!valor) continue;
    if (isFixo(chave)) query = query.eq(chave, valor);
    else query = query.eq(`extras->>${chave}`, valor);
  }

  const col = isFixo(args.ordenarPor) ? args.ordenarPor : `extras->>${args.ordenarPor}`;
  return query.order(col, { ascending: args.ordem === "asc", nullsFirst: false });
}

export function useItens(args: ItensQueryArgs) {
  return useQuery({
    queryKey: ["itens", args],
    queryFn: async (): Promise<{ rows: Item[]; total: number }> => {
      const from = (args.pagina - 1) * args.porPagina;
      const query = montarQuery(args, true).range(from, from + args.porPagina - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as Item[], total: count ?? 0 };
    },
  });
}

export async function buscarTodosItens(
  args: FiltroArgs,
  onProgresso?: (carregados: number) => void,
): Promise<Item[]> {
  const lote = 1000;
  const todos: Item[] = [];
  for (let inicio = 0; ; inicio += lote) {
    const { data, error } = await montarQuery(args, false).range(inicio, inicio + lote - 1);
    if (error) throw error;
    const rows = (data ?? []) as Item[];
    todos.push(...rows);
    onProgresso?.(todos.length);
    if (rows.length < lote) break;
  }
  return todos;
}


export function useValoresDistintos(chave: string, ativo: boolean) {
  return useQuery({
    queryKey: ["itens-distintos", chave],
    enabled: ativo,
    queryFn: async (): Promise<string[]> => {
      const col = isFixo(chave) ? chave : `extras->>${chave}`;
      const { data, error } = await sb
        .from("itens")
        .select(isFixo(chave) ? chave : `extras`)
        .limit(2000);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of (data ?? []) as Record<string, any>[]) {
        const v = isFixo(chave) ? row[chave] : row.extras?.[chave];
        if (v !== null && v !== undefined && String(v).trim() !== "") set.add(String(v));
      }
      void col;
      return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
  });
}

export function useTotalItens() {
  return useQuery({
    queryKey: ["itens-total"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await sb.from("itens").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens"] });
      qc.invalidateQueries({ queryKey: ["itens-total"] });
    },
  });
}

export function useSaveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Item> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await sb.from("itens").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itens"] }),
  });
}

export async function proximoCodigoInterno(): Promise<number> {
  const { data, error } = await sb
    .from("itens")
    .select("codigo_interno")
    .order("codigo_interno", { ascending: false })
    .limit(1);
  if (error) throw error;
  const atual = (data ?? [])[0]?.codigo_interno;
  return atual ? Number(atual) + 1 : 1;
}

export async function codigoInternoExiste(codigo: number): Promise<boolean> {
  const { count, error } = await sb
    .from("itens")
    .select("id", { count: "exact", head: true })
    .eq("codigo_interno", codigo);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export function useCriarItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Item>) => {
      const { error } = await sb.from("itens").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens"] });
      qc.invalidateQueries({ queryKey: ["itens-total"] });
    },
  });
}

// ---------- IMPORTACAO ----------
export type LinhaImport = Record<string, unknown>;

export async function buscarCodigosExistentes(codigos: number[]): Promise<Set<number>> {
  const existentes = new Set<number>();
  const chunk = 500;
  for (let i = 0; i < codigos.length; i += chunk) {
    const slice = codigos.slice(i, i + chunk);
    const { data, error } = await sb.from("itens").select("codigo_interno").in("codigo_interno", slice);
    if (error) throw error;
    for (const r of (data ?? []) as { codigo_interno: number }[]) existentes.add(Number(r.codigo_interno));
  }
  return existentes;
}

export async function upsertLote(rows: Record<string, unknown>[]) {
  const { error } = await sb.from("itens").upsert(rows, { onConflict: "codigo_interno" });
  if (error) throw error;
}

// ---------- FORNECEDORES (apoio) ----------
export type FornecedorOpcao = { id: string; codigo: number | null; razao_social: string | null; nome_fantasia: string | null; cnpj: string | null };

async function listarFornecedoresOpcoes(): Promise<FornecedorOpcao[]> {
  const todos: FornecedorOpcao[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await sb
      .from("fornecedores")
      .select("id, codigo, razao_social, nome_fantasia, cnpj")
      .order("codigo", { ascending: true })
      .range(i, i + 999);
    if (error) throw error;
    todos.push(...((data ?? []) as FornecedorOpcao[]));
    if ((data ?? []).length < 1000) break;
  }
  return todos;
}

export function useFornecedoresOpcoes(ativo = true) {
  return useQuery({ queryKey: ["fornecedores-opcoes"], enabled: ativo, queryFn: listarFornecedoresOpcoes });
}

/** Mapa de código / razão social / nome fantasia / CNPJ (minúsculo ou só dígitos) → id */
export async function mapaFornecedores(): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  for (const f of await listarFornecedoresOpcoes()) {
    if (f.codigo !== null) m.set(String(f.codigo), f.id);
    if (f.razao_social) m.set(f.razao_social.trim().toLowerCase(), f.id);
    if (f.nome_fantasia) m.set(f.nome_fantasia.trim().toLowerCase(), f.id);
    const d = (f.cnpj ?? "").replace(/\D/g, "");
    if (d) m.set(d, f.id);
  }
  return m;
}
