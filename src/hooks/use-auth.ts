import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export type Role = "administrador" | "operador" | "visitante";

export function useMyRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-role", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Role> => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data, error } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      const roles = (data ?? []).map((r: { role: Role }) => r.role);
      if (roles.includes("administrador")) return "administrador";
      if (roles.includes("operador")) return "operador";
      return "visitante";
    },
  });
}

export function usePermissions() {
  const { data: role } = useMyRole();
  return {
    role: role ?? "visitante",
    isAdmin: role === "administrador",
    canEdit: role === "administrador" || role === "operador",
    canDelete: role === "administrador",
    canMove: role === "administrador" || role === "operador",
  };
}
