import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NfeCabecalho, NfeLida } from "./nfe";

// Tabelas novas: cliente sem tipagem estrita, no mesmo padrão dos outros módulos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type Nota = NfeCabecalho & {
  id: string;
  status: "rascunho" | "confirmada" | "cancelada";
  fornecedor_id: string | null;
  criado_em: string;
  atualizado_em: string;
  confirmado_em: string | null;
};

export type ItemVinculo = {
  id: string;
  codigo_interno: number;
  descricao: string | null;
  referencia: string | null;
  codigo_barras: string | null;
  unidade_medida: string | null;
  saldo_atual: number;
  saldo_conhecido: boolean;
};

export type LinhaNota = {
  id: string;
  nota_id: string;
  ordem: number;
  codigo_produto: string | null;
  descricao: string;
  ean: string | null;
  ncm: string | null;
  unidade: string | null;
  quantidade: number;
  valor_unitario: number | null;
  valor_total: number | null;
  fator: number;
  item_id: string | null;
  item: ItemVinculo | null;
};

const ITEM_COLS = "id, codigo_interno, descricao, referencia, codigo_barras, unidade_medida, saldo_atual, saldo_conhecido";

export function useRascunhos() {
  return useQuery({
    queryKey: ["notas-entrada", "lista"],
    queryFn: async (): Promise<Nota[]> => {
      const { data, error } = await sb
        .from("notas_entrada")
        .select("*")
        .in("status", ["rascunho", "confirmada"])
        .order("atualizado_em", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function carregarNota(id: string): Promise<{ nota: Nota; linhas: LinhaNota[] }> {
  const { data: nota, error } = await sb.from("notas_entrada").select("*").eq("id", id).single();
  if (error) throw error;
  const { data: linhas, error: e2 } = await sb
    .from("notas_entrada_linhas")
    .select(`*, item:itens(${ITEM_COLS})`)
    .eq("nota_id", id)
    .order("ordem");
  if (e2) throw e2;
  return { nota, linhas: (linhas ?? []).map((l: LinhaNota) => ({ ...l, quantidade: Number(l.quantidade), fator: Number(l.fator) })) };
}

export async function notaPorChave(chave: string): Promise<Nota | null> {
  const { data, error } = await sb.from("notas_entrada").select("*").eq("chave_acesso", chave).neq("status", "cancelada").maybeSingle();
  if (error) throw error;
  return data;
}

/** Busca itens por EAN (vínculo automático). */
async function itensPorEan(eans: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  if (!eans.length) return m;
  const { data, error } = await sb.from("itens").select("id, codigo_barras").in("codigo_barras", eans);
  if (error) throw error;
  for (const r of data ?? []) if (r.codigo_barras && !m.has(r.codigo_barras)) m.set(r.codigo_barras, r.id);
  return m;
}

export async function fornecedorPorDocumento(doc: string | null): Promise<string | null> {
  if (!doc) return null;
  const { data, error } = await sb.from("fornecedores").select("id, cnpj").not("cnpj", "is", null).limit(5000);
  if (error) throw error;
  const f = (data ?? []).find((r: { cnpj: string }) => r.cnpj.replace(/\D/g, "") === doc);
  return f?.id ?? null;
}

/** Cria o rascunho com os dados reais do XML. Não altera estoque. */
export async function criarRascunho(lida: NfeLida, origem: "xml" | "sefaz" = "xml"): Promise<string> {
  const c = lida.cabecalho;
  if (c.chave_acesso) {
    const existente = await notaPorChave(c.chave_acesso);
    if (existente) {
      const e = new Error(existente.status === "confirmada" ? "Esta nota já teve entrada confirmada" : "Já existe um rascunho para esta nota");
      (e as Error & { notaId?: string }).notaId = existente.id;
      throw e;
    }
  }
  const fornecedor_id = await fornecedorPorDocumento(c.emit_documento);
  const { data: nota, error } = await sb
    .from("notas_entrada")
    .insert({ ...c, fornecedor_id, origem })
    .select("id")
    .single();
  if (error) throw error;
  const eans = await itensPorEan(lida.linhas.map((l) => l.ean).filter((e): e is string => !!e));
  const { error: e2 } = await sb.from("notas_entrada_linhas").insert(
    lida.linhas.map((l) => ({ ...l, nota_id: nota.id, fator: 1, item_id: l.ean ? (eans.get(l.ean) ?? null) : null })),
  );
  if (e2) {
    await sb.from("notas_entrada").delete().eq("id", nota.id);
    throw e2;
  }
  return nota.id;
}

/** Grava edições do rascunho (cabeçalho e linhas). */
export async function salvarRascunho(nota: Nota, linhas: LinhaNota[]) {
  const { error } = await sb
    .from("notas_entrada")
    .update({
      chave_acesso: nota.chave_acesso || null,
      numero: nota.numero,
      data_emissao: nota.data_emissao,
      emit_documento: nota.emit_documento,
      emit_razao_social: nota.emit_razao_social,
      valor_total: nota.valor_total,
      fornecedor_id: nota.fornecedor_id,
    })
    .eq("id", nota.id)
    .eq("status", "rascunho");
  if (error) throw error;
  for (const l of linhas) {
    const { error: e } = await sb.from("notas_entrada_linhas").update({ fator: l.fator, quantidade: l.quantidade, item_id: l.item_id }).eq("id", l.id);
    if (e) throw e;
  }
}

export async function descartarRascunho(id: string) {
  const { error } = await sb.from("notas_entrada").update({ status: "cancelada" }).eq("id", id).eq("status", "rascunho");
  if (error) throw error;
}

export async function confirmarNota(id: string): Promise<number> {
  const { data, error } = await sb.rpc("confirmar_nota_entrada", { _nota_id: id });
  if (error) throw error;
  return Number(data?.linhas ?? 0);
}

export async function definirSaldoInicial(itemId: string, saldo: number, observacao: string) {
  const { error } = await sb.rpc("definir_saldo_inicial", { _item_id: itemId, _saldo: saldo, _observacao: observacao });
  if (error) throw error;
}

export async function buscarItens(termo: string): Promise<ItemVinculo[]> {
  const t = termo.trim().replace(/[,()%]/g, " ");
  let q = sb.from("itens").select(ITEM_COLS).eq("status", "ativo").order("codigo_interno").limit(20);
  if (t) {
    const ors = [`descricao.ilike.%${t}%`, `referencia.ilike.%${t}%`, `codigo_barras.eq.${t}`];
    if (/^\d+$/.test(t)) ors.push(`codigo_interno.eq.${t}`);
    q = q.or(ors.join(","));
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function itemPorId(id: string): Promise<ItemVinculo> {
  const { data, error } = await sb.from("itens").select(ITEM_COLS).eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function cadastrarFornecedorDaNota(n: Nota): Promise<string> {
  const { data, error } = await sb
    .from("fornecedores")
    .insert({
      nome: n.emit_razao_social,
      razao_social: n.emit_razao_social,
      nome_fantasia: n.emit_nome_fantasia,
      cnpj: n.emit_documento,
      inscricao_estadual: n.emit_ie,
      uf: n.emit_uf,
      telefone: n.emit_telefone,
    })
    .select("id")
    .single();
  if (error) throw error;
  await sb.from("notas_entrada").update({ fornecedor_id: data.id }).eq("id", n.id);
  return data.id;
}

export function useInvalidarEstoque() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["notas-entrada"] });
    qc.invalidateQueries({ queryKey: ["itens"] });
    qc.invalidateQueries({ queryKey: ["fornecedores"] });
  };
}

export function useConfirmar() {
  const inv = useInvalidarEstoque();
  return useMutation({ mutationFn: confirmarNota, onSuccess: inv });
}
