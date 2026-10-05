import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string | null }) {
  if (status === "inativo")
    return <Badge variant="secondary" className="text-muted-foreground">Inativo</Badge>;
  return <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Ativo</Badge>;
}
