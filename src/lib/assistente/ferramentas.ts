import { tool } from "ai";
import { z } from "zod";

// Tools have no `execute`: the browser shows a confirmation card and runs the action
// only after the user approves (human-in-the-loop). Shared by server and client.
const n = <T extends z.ZodTypeAny>(t: T) => t.nullable();

export const ferramentas = {
  criar_compromisso: tool({
    description: "Propõe registrar um compromisso no calendário. Use datas ISO 8601 com fuso -03:00.",
    inputSchema: z.object({
      titulo: z.string(),
      descricao: n(z.string()),
      inicio: z.string().describe("ISO 8601"),
      fim: n(z.string()),
      dia_inteiro: z.boolean(),
      local: n(z.string()),
      categoria: z.enum(["producao", "manutencao", "reuniao", "entrega", "outro"]),
    }),
  }),
  criar_setor: tool({
    description: "Propõe criar um novo setor.",
    inputSchema: z.object({ nome: z.string(), descricao: n(z.string()) }),
  }),
  criar_item: tool({
    description: "Propõe cadastrar um novo item. O código interno é gerado automaticamente.",
    inputSchema: z.object({
      referencia: n(z.string()),
      descricao: z.string(),
      marca: n(z.string()),
      setor: n(z.string()),
      tipo_item: n(z.string()),
      unidade_medida: n(z.string()),
      codigo_barras: n(z.string()),
      custo_aquisicao: n(z.number()),
      preco_venda: n(z.number()),
    }),
  }),
  atualizar_itens: tool({
    description:
      "Propõe alterar campos de um ou mais itens existentes. O filtro combina critérios com E; informe ao menos um. Alterações nulas não mudam o campo.",
    inputSchema: z.object({
      filtro: z.object({
        codigos_internos: n(z.array(z.number())),
        referencias: n(z.array(z.string())),
        marca: n(z.string()),
        setor: n(z.string()),
        descricao_contem: n(z.string()),
        somente_sem_setor: z.boolean(),
      }),
      alteracoes: z.object({
        descricao: n(z.string()),
        setor: n(z.string()),
        marca: n(z.string()),
        tipo_item: n(z.string()),
        status: n(z.enum(["ativo", "inativo"])),
        unidade_medida: n(z.string()),
        custo_aquisicao: n(z.number()),
        preco_venda: n(z.number()),
        estoque_minimo: n(z.number()),
        estoque_maximo: n(z.number()),
      }),
    }),
  }),
  criar_ordem: tool({
    description: "Propõe criar uma Ordem de Produção (status inicial: aguardando separação).",
    inputSchema: z.object({
      numero: n(z.string()).describe("Se nulo, será gerado automaticamente"),
      referencia: z.string(),
      descricao: z.string(),
      quantidade: z.number().int(),
      observacoes: n(z.string()),
      materiais: z.array(
        z.object({
          referencia: z.string(),
          tipo_material: z.enum(["cartao", "embalagem", "etiqueta", "adesivo", "materia_prima", "caixa", "outro"]),
          quantidade: z.number(),
        }),
      ),
    }),
  }),
};

export type NomeFerramenta = keyof typeof ferramentas;
