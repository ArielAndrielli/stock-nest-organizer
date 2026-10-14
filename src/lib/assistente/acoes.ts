import { supabase } from "@/integrations/supabase/client";
import { proximoCodigoInterno } from "@/lib/itens";

const sb = supabase as unknown as { from: (t: string) => any; auth: typeof supabase.auth };

type Rec = Record<string, unknown>;
const limpar = (o: Rec) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));

export type FiltroItens = {
  codigos_internos: number[] | null; referencias: string[] | null; marca: string | null;
  setor: string | null; descricao_contem: string | null; somente_sem_setor: boolean;
};

function aplicarFiltro(q: any, f: FiltroItens) {
  if (f.codigos_internos?.length) q = q.in("codigo_interno", f.codigos_internos);
  if (f.referencias?.length) q = q.in("referencia", f.referencias);
  if (f.marca) q = q.ilike("marca", f.marca);
  if (f.setor) q = q.ilike("setor", f.setor);
  if (f.descricao_contem) q = q.ilike("descricao", `%${f.descricao_contem}%`);
  if (f.somente_sem_setor) q = q.or("setor.is.null,setor.eq.");
  return q;
}

export function filtroVazio(f: FiltroItens) {
  return !f.codigos_internos?.length && !f.referencias?.length && !f.marca && !f.setor && !f.descricao_contem && !f.somente_sem_setor;
}

export async function previaItens(f: FiltroItens) {
  if (filtroVazio(f)) return { total: 0, amostra: [] as Rec[] };
  const { data, count, error } = await aplicarFiltro(
    sb.from("itens").select("codigo_interno, referencia, descricao, setor", { count: "exact" }), f,
  ).order("codigo_interno").limit(5);
  if (error) throw error;
  return { total: count ?? 0, amostra: (data ?? []) as Rec[] };
}

async function usuario() {
  const { data } = await sb.auth.getUser();
  return data.user;
}

export async function executarAcao(nome: string, input: any): Promise<Rec> {
  switch (nome) {
    case "criar_compromisso": {
      const u = await usuario();
      const { data, error } = await sb.from("compromissos").insert({
        ...limpar(input), dia_inteiro: !!input.dia_inteiro, criado_por: u?.id, criado_por_email: u?.email,
      }).select("id").single();
      if (error) throw error;
      return { ok: true, id: data.id };
    }
    case "criar_setor": {
      const { data, error } = await sb.from("setores").insert(limpar(input)).select("id").single();
      if (error) throw error;
      return { ok: true, id: data.id };
    }
    case "criar_item": {
      const codigo = await proximoCodigoInterno();
      const { error } = await sb.from("itens").insert({ ...limpar(input), codigo_interno: codigo, status: "ativo" });
      if (error) throw error;
      return { ok: true, codigo_interno: codigo };
    }
    case "atualizar_itens": {
      if (filtroVazio(input.filtro)) throw new Error("Filtro vazio: nenhum item seria alterado.");
      const patch = limpar(input.alteracoes);
      if (!Object.keys(patch).length) throw new Error("Nenhuma alteração informada.");
      const { data, error } = await aplicarFiltro(sb.from("itens").update(patch), input.filtro).select("id");
      if (error) throw error;
      return { ok: true, itens_alterados: (data ?? []).length };
    }
    case "criar_ordem": {
      const u = await usuario();
      const numero = input.numero || `OP-${Date.now().toString().slice(-6)}`;
      const { data, error } = await sb.from("ordens_producao").insert({
        numero, referencia: input.referencia, descricao: input.descricao, quantidade: input.quantidade,
        observacoes: input.observacoes, criado_por: u?.id, criado_por_email: u?.email,
      }).select("id").single();
      if (error) throw error;
      const mats = (input.materiais ?? []) as { referencia: string; tipo_material: string; quantidade: number }[];
      if (mats.length) {
        const refs = mats.map((m) => m.referencia);
        const { data: its } = await sb.from("itens").select("id, referencia, descricao").in("referencia", refs);
        const porRef = new Map(((its ?? []) as Rec[]).map((i) => [i.referencia as string, i]));
        const { error: e2 } = await sb.from("ordem_itens").insert(mats.map((m) => {
          const it = porRef.get(m.referencia);
          return { ordem_id: data.id, item_id: it?.id ?? null, referencia: m.referencia, descricao: it?.descricao ?? null, tipo_material: m.tipo_material, quantidade: m.quantidade };
        }));
        if (e2) throw e2;
      }
      return { ok: true, id: data.id, numero };
    }
  }
  throw new Error("Ação desconhecida.");
}

export const ROTULOS: Record<string, string> = {
  criar_compromisso: "Registrar compromisso",
  criar_setor: "Criar setor",
  criar_item: "Cadastrar item",
  atualizar_itens: "Alterar itens",
  criar_ordem: "Criar ordem de produção",
};

export const LINKS: Record<string, string> = {
  criar_compromisso: "/calendario", criar_setor: "/setores", criar_item: "/itens", atualizar_itens: "/itens", criar_ordem: "/ordens",
};
