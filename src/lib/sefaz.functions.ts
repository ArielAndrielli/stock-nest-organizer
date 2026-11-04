import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DocSefaz = { nsu: string | null; schema: string; tipo: "nfe_completa" | "resumo" | "evento"; xml: string };
export type RetornoSefaz = { cStat: string | null; xMotivo: string | null; ultNSU: string | null; maxNSU: string | null; docs: DocSefaz[] };

/** Consulta a SEFAZ pelo intermediário externo. Não grava estoque; só devolve XMLs. */
export const consultarSefaz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: pode } = await sb.rpc("pode_editar", { _user_id: context.userId });
    if (!pode) throw new Error("Somente administradores e operadores podem consultar a SEFAZ");

    const url = process.env.SEFAZ_INTERMEDIARIO_URL;
    const chave = process.env.SEFAZ_INTERMEDIARIO_CHAVE;
    if (!url || !chave) throw new Error("Intermediário da SEFAZ não configurado");

    const { data: st, error } = await sb.from("sefaz_distribuicao").select("*").eq("id", 1).single();
    if (error) throw new Error(error.message);
    if (st.bloqueado_ate && new Date(st.bloqueado_ate) > new Date()) {
      const h = new Date(st.bloqueado_ate).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
      throw new Error(`A SEFAZ exige aguardar. Nova consulta liberada às ${h}.`);
    }

    const resp = await fetch(`${url.replace(/\/$/, "")}/distribuicao`, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ultNSU: st.ult_nsu }),
    });
    const corpo = (await resp.json().catch(() => ({}))) as RetornoSefaz & { erro?: string };
    if (!resp.ok) throw new Error(corpo.erro ? `Intermediário: ${corpo.erro}` : `Intermediário respondeu ${resp.status}`);

    // 137 = nada novo; 656 = consumo indevido → SEFAZ exige 1 hora de espera.
    const esperar = corpo.cStat === "137" || corpo.cStat === "656";
    await sb.from("sefaz_distribuicao").update({
      ult_nsu: corpo.ultNSU ?? st.ult_nsu,
      max_nsu: corpo.maxNSU,
      ultimo_cstat: corpo.cStat,
      ultimo_motivo: corpo.xMotivo,
      bloqueado_ate: esperar ? new Date(Date.now() + 3600_000).toISOString() : null,
      atualizado_em: new Date().toISOString(),
    }).eq("id", 1);

    return { ...corpo, docs: corpo.docs ?? [] } as RetornoSefaz;
  });
