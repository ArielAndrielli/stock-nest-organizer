import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BrainCircuit, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, useMyRole } from "@/hooks/use-auth";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_authenticated/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente de Estoque · Estoque" },
      { name: "description", content: "Pergunte sobre itens, setores e movimentações e receba insights do estoque." },
      { property: "og:title", content: "Assistente de Estoque" },
      { property: "og:description", content: "Insights acionáveis sobre o estoque com IA." },
    ],
  }),
  component: AssistentePage,
});

const SUGESTOES = [
  "Quais setores concentram mais itens e onde há lacunas de cadastro?",
  "Quais itens têm as menores margens de lucro?",
  "Resuma as movimentações recentes e o que devo acompanhar.",
  "O que devo priorizar para melhorar a qualidade do cadastro?",
];

function AssistentePage() {
  const { isAdmin } = usePermissions();
  const { isLoading } = useMyRole();
  if (isLoading) return <AppShell><Skeleton className="h-96 rounded-xl" /></AppShell>;
  if (!isAdmin) {
    return (
      <AppShell>
        <Card className="mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Somente administradores podem usar o assistente.</p>
        </Card>
      </AppShell>
    );
  }
  return <AppShell><Chat /></AppShell>;
}

function Chat() {
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
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport,
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
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Assistente de Estoque</h1>
            <p className="text-sm text-muted-foreground">Pergunte sobre itens, setores e movimentações.</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { stop(); setMessages([]); }}>
            <RotateCcw className="h-4 w-4" /> Nova conversa
          </Button>
        )}
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Conversation className="min-h-0 flex-1">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<BrainCircuit className="h-8 w-8" />}
                title="Como posso ajudar?"
                description="As respostas usam os dados atuais do seu estoque."
              >
                <div className="mt-4 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
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
                  <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : undefined}>
                    {m.parts.map((p, i) =>
                      p.type === "text" ? (
                        m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <span key={i} className="whitespace-pre-wrap">{p.text}</span>
                      ) : null,
                    )}
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
              <PromptInputTextarea autoFocus placeholder="Ex.: Quais setores precisam de atenção?" />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </Card>
    </div>
  );
}
