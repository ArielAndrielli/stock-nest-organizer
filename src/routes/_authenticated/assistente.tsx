import { createFileRoute } from "@tanstack/react-router";
import { BrainCircuit, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions, useMyRole } from "@/hooks/use-auth";
import { AssistenteChat } from "@/components/assistente/AssistenteChat";

export const Route = createFileRoute("/_authenticated/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente de Estoque · Estoque" },
      { name: "description", content: "Pergunte sobre o estoque e peça ações com confirmação." },
      { property: "og:title", content: "Assistente de Estoque" },
      { property: "og:description", content: "Insights e ações no estoque com IA." },
    ],
  }),
  component: AssistentePage,
});

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
  return (
    <AppShell>
      <div className="flex h-[calc(100vh-9rem)] flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Assistente de Estoque</h1>
            <p className="text-sm text-muted-foreground">Relatórios, análises e ações com sua confirmação.</p>
          </div>
        </div>
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden"><AssistenteChat /></Card>
      </div>
    </AppShell>
  );
}
