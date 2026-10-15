import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePermissions } from "@/hooks/use-auth";
import { AssistenteChat } from "./AssistenteChat";

export function AssistenteFlutuante() {
  const { isAdmin } = usePermissions();
  const [aberto, setAberto] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!isAdmin || path === "/assistente") return null;
  return (
    <>
      <Button onClick={() => setAberto(true)} size="icon" aria-label="Abrir assistente"
        className="no-print fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg">
        <BrainCircuit className="h-5 w-5" />
      </Button>
      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4"><SheetTitle>Assistente de Estoque</SheetTitle></SheetHeader>
          <div className="min-h-0 flex-1"><AssistenteChat compacto /></div>
        </SheetContent>
      </Sheet>
    </>
  );
}
