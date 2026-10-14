import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, type UIMessage } from "ai";
import { createResponsesCall } from "./responses.server";
import { ferramentas } from "./ferramentas";

const MODELO = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function json(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clienteDoUsuario(token: string) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Sb = ReturnType<typeof clienteDoUsuario>;

async function todos<T>(sb: Sb, tabela: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await sb.from(tabela).select(cols).range(i, i + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

function contar<T>(rows: T[], f: (r: T) => string, top = 15) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(f(r), (m.get(f(r)) ?? 0) + 1);
  return Array.from(m).sort((a, b) => b[1] - a[1]).slice(0, top);
}

async function montarContexto(sb: Sb) {
  type It = {
    codigo_interno: number; referencia: string | null; descricao: string | null; marca: string | null;
    setor: string | null; status: string | null; tipo_item: string | null; custo_aquisicao: number | null;
    preco_venda: number | null; estoque_minimo: number | null; estoque_maximo: number | null; deposito: string | null;
  };
  const [itens, setores, vagas, caixas, movs, hist] = await Promise.all([
    todos<It>(sb, "itens", "codigo_interno, referencia, descricao, marca, setor, status, tipo_item, custo_aquisicao, preco_venda, estoque_minimo, estoque_maximo, deposito"),
    todos<{ id: string; nome: string }>(sb, "setores", "id, nome"),
    todos<{ id: string; setor_id: string; codigo: string; capacidade: number }>(sb, "vagas", "id, setor_id, codigo, capacidade"),
    todos<{ vaga_id: string; quantidade: number }>(sb, "caixas", "vaga_id, quantidade"),
    sb.from("movimentacoes_caixa").select("criado_em, caixa:caixas(nome), origem:vagas!movimentacoes_caixa_vaga_origem_id_fkey(codigo), destino:vagas!movimentacoes_caixa_vaga_destino_id_fkey(codigo)").order("criado_em", { ascending: false }).limit(30),
    sb.from("historico_eventos").select("criado_em, acao, entidade, entidade_nome").order("criado_em", { ascending: false }).limit(30),
  ]);

  const comCusto = itens.filter((i) => i.custo_aquisicao != null);
  const comPreco = itens.filter((i) => i.preco_venda != null && i.custo_aquisicao != null && Number(i.preco_venda) > 0);
  const margens = comPreco
    .map((i) => ({ ref: i.referencia ?? String(i.codigo_interno), m: (Number(i.preco_venda) - Number(i.custo_aquisicao)) / Number(i.preco_venda) }))
    .sort((a, b) => a.m - b.m);

  const ocupacaoSetor = setores.map((s) => {
    const vs = vagas.filter((v) => v.setor_id === s.id);
    const cap = vs.reduce((a, v) => a + v.capacidade, 0);
    const oc = caixas.filter((c) => vs.some((v) => v.id === c.vaga_id)).reduce((a, c) => a + c.quantidade, 0);
    return { setor: s.nome, vagas: vs.length, capacidade: cap, ocupacao: oc };
  });

  const amostra = itens.slice(0, 40).map((i) => ({
    cod: i.codigo_interno, ref: i.referencia, desc: i.descricao?.slice(0, 60), marca: i.marca, setor: i.setor, status: i.status,
  }));

  return {
    gerado_em: new Date().toISOString(),
    itens: {
      total: itens.length,
      ativos: itens.filter((i) => i.status !== "inativo").length,
      inativos: itens.filter((i) => i.status === "inativo").length,
      sem_setor: itens.filter((i) => !i.setor).length,
      sem_custo: itens.length - comCusto.length,
      valor_total_custo_unitario: comCusto.reduce((a, i) => a + Number(i.custo_aquisicao), 0),
      sem_estoque_min_max: itens.filter((i) => i.estoque_minimo == null || i.estoque_maximo == null).length,
      por_setor: contar(itens, (i) => i.setor || "Sem setor"),
      por_marca: contar(itens, (i) => i.marca || "Sem marca"),
      por_tipo: contar(itens, (i) => i.tipo_item || "Sem tipo"),
      por_deposito: contar(itens, (i) => i.deposito || "Sem depósito"),
      menores_margens: margens.slice(0, 10),
      amostra,
    },
    setores: { total: setores.length, ocupacao: ocupacaoSetor },
    vagas_total: vagas.length,
    caixas_total: caixas.length,
    movimentacoes_recentes: movs.data ?? [],
    historico_recente: hist.data ?? [],
    observacao: "O cadastro de itens não guarda quantidade em estoque; valor_total_custo_unitario é a soma dos custos unitários.",
  };
}

export async function handleAssistente(request: Request) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return json(500, "Assistente não configurado.");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, "Faça login para usar o assistente.");

  const sb = clienteDoUsuario(token);
  const { data: u, error: eu } = await sb.auth.getUser(token);
  if (eu || !u.user) return json(401, "Sessão inválida. Entre novamente.");
  const { data: admin } = await sb.rpc("has_role", { _user_id: u.user.id, _role: "administrador" });
  if (!admin) return json(403, "Apenas administradores podem usar o assistente.");

  let body: { messages?: UIMessage[] };
  try {
    body = await request.json();
  } catch {
    return json(400, "Requisição inválida.");
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
  if (messages.length === 0) return json(400, "Envie uma pergunta.");

  let contexto: unknown;
  try {
    contexto = await montarContexto(sb);
  } catch (e) {
    return json(500, "Não foi possível ler os dados do estoque: " + (e as Error).message);
  }

  const instrucoes = `Você é o assistente de estoque da empresa. Responda sempre em português do Brasil.
Use APENAS os dados em JSON abaixo (instantâneo atual do sistema). Não invente números; se faltar informação, diga o que falta e como cadastrá-la.
Responda de forma objetiva, com markdown. Para análises, termine com "Ações recomendadas" (2 a 5 passos). Para relatórios, use tabelas markdown.
Data/hora atual: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília).
AÇÕES: quando o usuário pedir para criar ou alterar algo (compromisso, setor, item, ordem de produção, alterar itens), chame a ferramenta correspondente. Ela NÃO grava sozinha: o usuário verá um cartão de confirmação. Não diga que já foi feito antes do resultado da ferramenta. Após o resultado, resuma em uma frase. Se faltar informação essencial, pergunte antes. Use nomes de setores existentes.

DADOS:
${JSON.stringify(contexto)}`;

  const { response } = createResponsesCall(
    request,
    { baseURL: GATEWAY, apiKey, model: MODELO },
    await convertToModelMessages(messages),
    instrucoes,
    ferramentas,
  );
  return response();
}
