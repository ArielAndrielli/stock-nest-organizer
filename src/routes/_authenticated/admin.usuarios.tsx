import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useUsuarios, useSetUserRole, type UserRow } from "@/lib/queries";
import { usePermissions } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · Estoque" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: UsuariosPage,
});

function UsuariosPage() {
  const { isAdmin } = usePermissions();
  const { data, isLoading } = useUsuarios();
  const setRole = useSetUserRole();

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <p className="font-medium">Acesso restrito</p>
          <p className="text-sm text-muted-foreground">Apenas Administradores gerenciam usuários.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerencie os papéis dos usuários cadastrados.</p>
      </div>

      {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

      <div className="space-y-2">
        {(data ?? []).map((u: UserRow) => (
          <Card key={u.id} className="animate-fade-in">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{u.nome_exibicao ?? u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <Select
                value={u.role}
                onValueChange={(v) =>
                  setRole.mutate(
                    { userId: u.id, role: v as UserRow["role"] },
                    {
                      onSuccess: () => toast.success("Papel atualizado."),
                      onError: (e) => toast.error(e instanceof Error ? e.message : "Erro."),
                    },
                  )
                }
              >
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <b>Administrador</b>: acesso total. <b>Operador</b>: cria, edita e move caixas. <b>Visitante</b>: somente leitura.
        <Button variant="link" className="ml-2 h-auto p-0" onClick={() => window.location.reload()}>Recarregar</Button>
      </div>
    </AppShell>
  );
}
