import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { BrainCircuit, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { executarAcao, previaItens, ROTULOS, LINKS, type FiltroItens } from "@/lib/assistente/acoes";

const SUGESTOES = [
  "Quais setores concentram mais itens e onde há lacunas de cadastro?",
  "Gere um relatório dos itens por marca em tabela.",
  "Registre uma reunião amanhã às 10h com o fornecedor.",
  "Atribua o setor Pentes aos itens cuja descrição contenha pente.",
];

const NOMES_CAMPOS: Record<string, string> = {
  titulo: "Título", descricao: "Descrição", inicio: "Início", fim: "Fim", dia_inteiro: "Dia inteiro", local: "Local",
  categoria: "Categoria", nome: "Nome", referencia: "Referência", marca: "Marca", setor: "Setor", tipo_item: "Tipo",
  unidade_medida: "Unidade", codigo_barras: "Código de barras", custo_aquisicao: "Custo", preco_venda: "Preço de venda",
  numero: "Número", quantidade: "Quantidade", observacoes: "Observações", status: "Status",
  estoque_minimo: "Estoque mínimo", estoque_maximo: "Estoque máximo",
};

function fmt(v: unknown): string {
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toLocaleString("pt-BR");
  }
  return String(v);
}

function Campos({ obj }: { obj: Record<string, unknown> }) {
  const linhas = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object");
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {linhas.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{NOMES_CAMPOS[k] ?? k}</dt>
          <dd className="break-words">{fmt(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function PreviaItens({ filtro }: { filtro: FiltroItens }) {
  const [p, setP] = useState<{ total: number; amostra: Record<string, unknown>[] } | null>(null);
  useEffect(() => {
    previaItens(filtro).then(setP).catch(() => setP({ total: 0, amostra: [] }));
  }, [JSON.stringify(filtro)]);
  if (!p) return <p className="text-sm text-muted-foreground">Contando itens…</p>;
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">{p.total} item(ns) serão alterados.</p>
      {p.amostra.map((i) => (
        <p key={String(i.codigo_interno)} className="truncate text-muted-foreground">
          #{String(i.codigo_interno)} · {String(i.referencia ?? "")} · {String(i.descricao ?? "")}
        </p>
      ))}
      {p.total > p.amostra.length && <p className="text-xs text-muted-foreground">…e mais {p.total - p.amostra.length}.</p>}
    </div>
  );
}

type ToolPart = { type: string; toolCallId: string; state: string; input?: any; output?: any; errorText?: string };

function CartaoAcao({ part, onResolver }: { part: ToolPart; onResolver: (output: unknown) => void }) {
  const nome = part.type.replace(/^tool-/, "");
  const [gravando, setGravando] = useState(false);
  const qc = useQueryClient();
  const input = part.input ?? {};

  const confirmar = async () => {
    setGravando(true);
    try {
      const r = await executarAcao(nome, input);
      qc.invalidateQueries();
      toast.success(`${ROTULOS[nome] ?? "Ação"} concluída.`);
      onResolver(r);
    } catch (e) {
      const msg = (e as Error).message;
      toast.error("Não foi possível gravar: " + msg);
      onResolver({ ok: false, erro: msg });
    } finally {
      setGravando(false);
    }
  };

  const out = part.output as { ok?: boolean; recusado?: boolean; erro?: string } | undefined;
  const pendente = part.state === "input-available";

  return (
    <div className="my-2 rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{ROTULOS[nome] ?? nome}</span>
        {out?.ok && <span className="text-xs font-medium text-primary">Gravado</span>}
        {out?.recusado && <span className="text-xs text-muted-foreground">Recusado</span>}
        {out && out.ok === false && !out.recusado && <span className="text-xs text-destructive">Falhou</span>}
      </div>
      {part.state === "input-streaming" ? (
        <p className="text-sm text-muted-foreground">Preparando…</p>
      ) : nome === "atualizar_itens" ? (
        <div className="space-y-2">
          <PreviaItens filtro={input.filtro} />
          <div className="border-t pt-2"><p className="mb-1 text-xs uppercase text-muted-foreground">Novos valores</p><Campos obj={input.alteracoes ?? {}} /></div>
        </div>
      ) : (
        <>
          <Campos obj={input} />
          {nome === "criar_ordem" && Array.isArray(input.materiais) && input.materiais.length > 0 && (
            <div className="mt-2 border-t pt-2 text-sm">
              <p className="mb-1 text-xs uppercase text-muted-foreground">Materiais</p>
              {input.materiais.map((m: any, i: number) => (
                <p key={i}>{m.quantidade} × {m.referencia} <span className="text-muted-foreground">({m.tipo_material})</span></p>
              ))}
            </div>
          )}
        </>
      )}
      {pendente && (
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={gravando} onClick={() => onResolver({ ok: false, recusado: true })}>
            <X className="mr-1 h-4 w-4" /> Recusar
          </Button>
          <Button size="sm" disabled={gravando} onClick={confirmar}>
            {gravando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />} Confirmar
          </Button>
        </div>
      )}
      {out?.ok && LINKS[nome] && (
        <Link to={LINKS[nome]} className="mt-2 inline-block text-xs text-primary underline">Abrir tela</Link>
      )}
    </div>
  );
}

export function AssistenteChat({ compacto = false }: { compacto?: boolean }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistente",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
      }),
    [],
  );
  const { messages, sendMessage, status, stop, setMessages, addToolOutput } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (e) => {
      const msg = e.message || "";
      let texto = msg;
      try { texto = JSON.parse(msg).error ?? msg; } catch { /* texto puro */ }
      if (/429/.test(msg)) texto = "Muitas perguntas em sequência. Aguarde um instante.";
      else if (/402/.test(msg)) texto = "Os créditos de IA acabaram. Adicione créditos ao espaço de trabalho.";
      toast.error(texto || "Falha ao consultar o assistente.");
    },
  });
  const ocupado = status === "submitted" || status === "streaming";
  const enviar = (texto: string) => {
    if (!texto.trim() || ocupado) return;
    sendMessage({ text: texto.trim() });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {messages.length > 0 && (
        <div className="flex justify-end border-b px-3 py-2">
          <Button variant="ghost" size="sm" onClick={() => { stop(); setMessages([]); }}>Nova conversa</Button>
        </div>
      )}
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<BrainCircuit className="h-8 w-8" />}
              title="Como posso ajudar?"
              description="Peça relatórios ou ações: você confirma antes de gravar."
            >
              <div className={`mt-4 grid w-full max-w-2xl gap-2 ${compacto ? "" : "sm:grid-cols-2"}`}>
                {SUGESTOES.map((s) => (
                  <Button key={s} variant="outline" className="h-auto whitespace-normal py-3 text-left text-sm font-normal" onClick={() => enviar(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "w-full"}>
                  {m.parts.map((p, i) => {
                    if (p.type === "text")
                      return m.role === "assistant"
                        ? <MessageResponse key={i}>{p.text}</MessageResponse>
                        : <span key={i} className="whitespace-pre-wrap">{p.text}</span>;
                    if (p.type.startsWith("tool-")) {
                      const tp = p as unknown as ToolPart;
                      return (
                        <CartaoAcao key={tp.toolCallId} part={tp}
                          onResolver={(output) => addToolOutput({ tool: tp.type.replace(/^tool-/, "") as never, toolCallId: tp.toolCallId, output: output as never })} />
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && <Shimmer className="text-sm">Analisando os dados do estoque…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t p-3">
        <PromptInput onSubmit={({ text }) => enviar(text ?? "")}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ex.: Crie o setor Acessórios" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
