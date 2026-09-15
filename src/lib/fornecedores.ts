import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as typedSupabase } from "@/integrations/supabase/client";

const sb = typedSupabase as unknown as {
  from: (t: string) => {
    select: (cols?: string, opts?: unknown) => any;
    insert: (v: unknown) => any;
    upsert: (v: unknown, o?: unknown) => any;
    update: (v: unknown) => any;
    delete: () => any;
  };
};

export const CAMPOS_FIXOS_FORNECEDOR = [
  "codigo",
  "razao_social",
  "nome_fantasia",
  "cnpj",
  "inscricao_estadual",
  "uf",
  "telefone",
  "nome",
  "email",
  "cidade",
  "observacoes",
] as const;

export const COLUNAS_PADRAO_FORNECEDOR = [
  "codigo",
  "razao_social",
  "nome_fantasia",
  "cnpj",
  "inscricao_estadual",
  "uf",
  "telefone",
];

export type Fornecedor = {
  id: string;
  codigo: number | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  uf: string | null;
  observacoes: string | null;
  extras: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
};

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export async function proximoCodigoFornecedor(): Promise<number> {
  const { data, error } = await sb
    .from("fornecedores")
    .select("codigo")
    .order("codigo", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) throw error;
  const atual = (data ?? [])[0]?.codigo as number | null | undefined;
  return (atual ?? 0) + 1;
}

export type FornecedorCampo = {
  id: string;
  chave: string;
  rotulo: string;
  tipo: string;
  fixo: boolean;
  filtravel: boolean;
  visivel_padrao: boolean;
  ordem: number;
};

export function isFixoFornecedor(chave: string) {
  return (CAMPOS_FIXOS_FORNECEDOR as readonly string[]).includes(chave);
}

export function valorCampoFornecedor(f: Fornecedor, chave: string): unknown {
  if (isFixoFornecedor(chave)) return (f as unknown as Record<string, unknown>)[chave];
  return f.extras?.[chave];
}

export function somenteDigitos(v: string) {
  return v.replace(/\D+/g, "");
}

export const MAX_DIGITOS_DOCUMENTO = 20;

export function documentoValido(v: string | null) {
  const d = somenteDigitos(v ?? "");
  return d.length <= MAX_DIGITOS_DOCUMENTO;
}

export function formatarDocumento(v: string | null) {
  const d = somenteDigitos(v ?? "");
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return d || (v ?? "");
}

export const formatarCnpj = formatarDocumento;

// ---------- CAMPOS ----------
export function useFornecedorCampos() {
  return useQuery({
    queryKey: ["fornecedor-campos"],
    queryFn: async (): Promise<FornecedorCampo[]> => {
      const { data, error } = await sb
        .from("fornecedor_campos")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FornecedorCampo[];
    },
  });
}

export function useCriarCamposFornecedor() {
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
      const { error } = await sb.from("fornecedor_campos").upsert(payload, { onConflict: "chave" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedor-campos"] }),
  });
}

// ---------- LISTAGEM ----------
export type FornecedoresQueryArgs = {
  q: string;
  ordenarPor: string;
  ordem: "asc" | "desc";
  pagina: number;
  porPagina: number;
};

export function useFornecedores(args: FornecedoresQueryArgs) {
  return useQuery({
    queryKey: ["fornecedores", args],
    queryFn: async (): Promise<{ rows: Fornecedor[]; total: number }> => {
      let query = sb.from("fornecedores").select("*", { count: "exact" });
      const termo = args.q.trim();
      if (termo) {
        const like = `%${termo.replace(/[%,]/g, " ")}%`;
        const filtros = [
          `nome.ilike.${like}`,
          `razao_social.ilike.${like}`,
          `nome_fantasia.ilike.${like}`,
          `cnpj.ilike.${like}`,
          `inscricao_estadual.ilike.${like}`,
          `telefone.ilike.${like}`,
          `email.ilike.${like}`,
          `cidade.ilike.${like}`,
          `uf.ilike.${like}`,
        ];
        if (/^\d+$/.test(termo)) filtros.push(`codigo.eq.${termo}`);
        query = query.or(filtros.join(","));
      }
      const col = isFixoFornecedor(args.ordenarPor) ? args.ordenarPor : `extras->>${args.ordenarPor}`;
      query = query.order(col, { ascending: args.ordem === "asc", nullsFirst: false });
      const from = (args.pagina - 1) * args.porPagina;
      const { data, error, count } = await query.range(from, from + args.porPagina - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Fornecedor[], total: count ?? 0 };
    },
  });
}

export function useTotalFornecedores() {
  return useQuery({
    queryKey: ["fornecedores-total"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await sb.from("fornecedores").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function invalidar(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["fornecedores"] });
  qc.invalidateQueries({ queryKey: ["fornecedores-total"] });
}

export function useCriarFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Fornecedor>) => {
      const { error } = await sb.from("fornecedores").insert(input);
      if (error) throw error;
    },
    onSuccess: () => invalidar(qc),
  });
}

export function useSalvarFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Fornecedor> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await sb.from("fornecedores").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidar(qc),
  });
}

export function useExcluirFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidar(qc),
  });
}

// ---------- IMPORTACAO ----------
export async function buscarCnpjsExistentes(cnpjs: string[]): Promise<Set<string>> {
  const existentes = new Set<string>();
  const chunk = 500;
  for (let i = 0; i < cnpjs.length; i += chunk) {
    const slice = cnpjs.slice(i, i + chunk);
    if (slice.length === 0) continue;
    const { data, error } = await sb.from("fornecedores").select("cnpj").in("cnpj", slice);
    if (error) throw error;
    for (const r of (data ?? []) as { cnpj: string | null }[]) if (r.cnpj) existentes.add(r.cnpj);
  }
  return existentes;
}

export async function buscarNomesExistentes(nomes: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  const chunk = 500;
  for (let i = 0; i < nomes.length; i += chunk) {
    const slice = nomes.slice(i, i + chunk);
    if (slice.length === 0) continue;
    const { data, error } = await sb.from("fornecedores").select("id, nome").in("nome", slice);
    if (error) throw error;
    for (const r of (data ?? []) as { id: string; nome: string }[]) mapa.set(r.nome, r.id);
  }
  return mapa;
}

export async function upsertLoteFornecedores(rows: Record<string, unknown>[]) {
  const comCnpj = rows.filter((r) => r.cnpj);
  const semCnpj = rows.filter((r) => !r.cnpj);
  if (comCnpj.length) {
    const { error } = await sb.from("fornecedores").upsert(comCnpj, { onConflict: "cnpj" });
    if (error) throw error;
  }
  for (const row of semCnpj) {
    const id = (row as { id?: string }).id;
    if (id) {
      const { id: _omit, ...rest } = row as Record<string, unknown> & { id: string };
      const { error } = await sb.from("fornecedores").update(rest).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await sb.from("fornecedores").insert(row);
      if (error) throw error;
    }
  }
}
