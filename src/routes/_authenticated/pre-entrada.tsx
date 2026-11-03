import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, FileUp, Info, Link2, Loader2, PackagePlus, ScanLine, Search, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { lerXmlNfe, problemasConfirmacao } from "@/lib/nfe";
import {
  buscarItens, cadastrarFornecedorDaNota, carregarNota, criarRascunho, definirSaldoInicial, descartarRascunho,
  itemPorId, notaPorChave, salvarRascunho, useConfirmar, useInvalidarEstoque, useRascunhos,
  type ItemVinculo, type LinhaNota, type Nota,
} from "@/lib/pre-entrada";
import { proximoCodigoInterno, UNIDADES } from "@/lib/itens";
import { useSetores } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pre-entrada")({
  head: () => ({
    meta: [
      { title: "Pré-Entrada de Mercadorias — Estoque" },
      { name: "description", content: "Importe o XML da NF-e, vincule os itens e confirme a entrada no estoque." },
      { property: "og:title", content: "Pré-Entrada de Mercadorias — Estoque" },
      { property: "og:description", content: "Rascunhos de NF-e, vínculo de itens e entrada no estoque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PreEntradaPage,
});

const brl = (v: number | null) => (v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const qtdFmt = (v: number) => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const dataFmt = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const docFmt = (d: string | null) =>
  !d ? "—" : d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : d;
const msg = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Erro inesperado");

function SaldoInfo({ item }: { item: ItemVinculo }) {
  return item.saldo_conhecido ? (
    <span className="text-xs text-muted-foreground">Saldo: {qtdFmt(item.saldo_atual)}</span>
  ) : (
    <span className="text-xs text-amber-700 dark:text-amber-400" title="Sem contagem inicial: o saldo mostra só as entradas registradas no sistema, não o estoque físico.">
      Saldo não informado{Number(item.saldo_atual) ? ` (+${qtdFmt(item.saldo_atual)} registrados)` : ""}
    </span>
  );
}

function BuscaItem({ onEscolher }: { onEscolher: (i: ItemVinculo) => void }) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [res, setRes] = useState<ItemVinculo[]>([]);
  const [carregando, setCarregando] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    const t = setTimeout(async () => {
      setCarregando(true);
      try { setRes(await buscarItens(termo)); } catch (e) { toast.error(msg(e)); } finally { setCarregando(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [termo, aberto]);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline"><Link2 className="mr-1 h-4 w-4" />Vincular</Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Descrição, referência, código ou EAN" className="h-9 pl-8" />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {carregando && <div className="p-3 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Buscando…</div>}
          {!carregando && !res.length && <div className="p-3 text-sm text-muted-foreground">Nenhum item ativo encontrado.</div>}
          {!carregando && res.map((i) => (
            <button key={i.id} type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => { onEscolher(i); setAberto(false); }}>
              <div className="font-medium">#{i.codigo_interno} {i.descricao ?? i.referencia ?? "Sem descrição"}</div>
              <div className="text-xs text-muted-foreground">{i.referencia ?? ""} {i.codigo_barras ? `· EAN ${i.codigo_barras}` : ""} {i.unidade_medida ? `· ${i.unidade_medida}` : ""}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PreEntradaPage() {
  const [chave, setChave] = useState("");
  const [nota, setNota] = useState<Nota | null>(null);
  const [linhas, setLinhas] = useState<LinhaNota[]>([]);
  const [alterado, setAlterado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [sefazAberto, setSefazAberto] = useState(false);
  const [cadastrando, setCadastrando] = useState<LinhaNota | null>(null);
  const [saldoItem, setSaldoItem] = useState<ItemVinculo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rascunhos = useRascunhos();
  const confirmar = useConfirmar();
  const invalidar = useInvalidarEstoque();

  const abrir = async (id: string) => {
    setOcupado(true);
    try {
      const r = await carregarNota(id);
      setNota(r.nota); setLinhas(r.linhas); setAlterado(false); setChave(r.nota.chave_acesso ?? "");
    } catch (e) { toast.error(msg(e)); } finally { setOcupado(false); }
  };

  const importarXml = async (file: File) => {
    setOcupado(true);
    try {
      const lida = lerXmlNfe(await file.text());
      const id = await criarRascunho(lida);
      invalidar();
      await abrir(id);
      toast.success(`Rascunho criado com ${lida.linhas.length} linha(s). Nada foi lançado no estoque ainda.`);
    } catch (e) {
      const notaId = (e as { notaId?: string }).notaId;
      toast.error(msg(e), notaId ? { action: { label: "Abrir", onClick: () => abrir(notaId) } } : undefined);
    } finally { setOcupado(false); }
  };

  const buscarChave = async () => {
    if (chave.length !== 44) return toast.error("A chave de acesso precisa ter 44 dígitos");
    setOcupado(true);
    try {
      const n = await notaPorChave(chave);
      if (n) await abrir(n.id);
      else toast.info("Nenhum rascunho com esta chave. Sem integração com a SEFAZ, os dados da nota só podem vir do arquivo XML.", { duration: 7000 });
    } catch (e) { toast.error(msg(e)); } finally { setOcupado(false); }
  };

  const atualizar = (id: string, patch: Partial<LinhaNota>) => {
    setLinhas((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setAlterado(true);
  };

  const salvar = async (silencioso = false) => {
    if (!nota) return false;
    try {
      await salvarRascunho(nota, linhas);
      setAlterado(false); invalidar();
      if (!silencioso) toast.success("Rascunho salvo. O estoque não foi alterado.");
      return true;
    } catch (e) { toast.error(msg(e)); return false; }
  };

  const descartar = async () => {
    if (!nota || !confirm("Descartar este rascunho? A nota poderá ser importada novamente.")) return;
    try { await descartarRascunho(nota.id); setNota(null); setLinhas([]); setChave(""); invalidar(); toast("Rascunho descartado"); }
    catch (e) { toast.error(msg(e)); }
  };

  const cadastrarFornecedor = async () => {
    if (!nota) return;
    try { const id = await cadastrarFornecedorDaNota(nota); setNota({ ...nota, fornecedor_id: id }); invalidar(); toast.success("Fornecedor cadastrado com os dados da nota"); }
    catch (e) { toast.error(msg(e)); }
  };

  const problemas = nota ? problemasConfirmacao(nota, linhas) : [];
  const somenteLeitura = nota?.status !== "rascunho";

  const confirmarEntrada = async () => {
    if (!nota) return;
    if (problemas.length) return toast.error(problemas[0]);
    if (!(await salvar(true))) return;
    try {
      const n = await confirmar.mutateAsync(nota.id);
      toast.success(`Sucesso! ${n} item(ns) lançados no estoque.`);
      await abrir(nota.id);
    } catch (e) { toast.error(msg(e)); }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pré-Entrada de Mercadorias</h1>
          <p className="text-sm text-muted-foreground">Importe o XML da NF-e, revise os vínculos e confirme a entrada. O estoque só muda na confirmação.</p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input value={chave} onChange={(e) => setChave(e.target.value.replace(/\D/g, "").slice(0, 44))} onKeyDown={(e) => e.key === "Enter" && buscarChave()}
                  placeholder="Bipar Chave de Acesso da NF (44 dígitos) para abrir um rascunho" className="h-12 pl-11 font-mono text-base" aria-label="Chave de acesso" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{chave.length}/44</span>
              </div>
              <Button size="lg" className="h-12" onClick={buscarChave} disabled={ocupado}><Search className="mr-2 h-4 w-4" />Buscar</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" className="hidden" aria-label="Arquivo XML da NF-e"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importarXml(f); e.target.value = ""; }} />
              <Button onClick={() => fileRef.current?.click()} disabled={ocupado}>
                {ocupado ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}Importar XML da NF-e
              </Button>
              <Button variant="ghost" onClick={() => setSefazAberto(true)}><CloudOff className="mr-2 h-4 w-4" />Importar Notas da SEFAZ</Button>
            </div>
          </CardContent>
        </Card>

        {!nota ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Notas recentes</CardTitle></CardHeader>
            <CardContent>
              {rascunhos.isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> :
                !rascunhos.data?.length ? (
                  <div className="py-8 text-center text-muted-foreground"><ScanLine className="mx-auto mb-3 h-10 w-10 opacity-50" />Nenhuma nota ainda. Importe um XML para começar.</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>NF</TableHead><TableHead>Fornecedor</TableHead><TableHead>Emissão</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                    <TableBody>
                      {rascunhos.data.map((n) => (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium">{n.numero ?? "—"}{n.serie ? `/${n.serie}` : ""}</TableCell>
                          <TableCell>{n.emit_razao_social ?? "—"}</TableCell>
                          <TableCell>{dataFmt(n.data_emissao)}</TableCell>
                          <TableCell className="text-right">{brl(n.valor_total)}</TableCell>
                          <TableCell>{n.status === "rascunho" ? <Badge variant="secondary">Rascunho</Badge> : <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Confirmada</Badge>}</TableCell>
                          <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => abrir(n.id)}>{n.status === "rascunho" ? "Continuar" : "Ver"}</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Nota Fiscal {nota.numero ?? ""}</CardTitle>
                {nota.status === "rascunho" ? <Badge variant="secondary">Rascunho · Em análise</Badge> : <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Entrada confirmada</Badge>}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {([["Número / Série", `${nota.numero ?? "—"}${nota.serie ? ` / ${nota.serie}` : ""}`], ["Data de Emissão", dataFmt(nota.data_emissao)], ["Fornecedor", nota.emit_razao_social ?? "—"], ["CNPJ/CPF", docFmt(nota.emit_documento)], ["Valor Total", brl(nota.valor_total)]] as const).map(([k, v]) => (
                    <div key={k}><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium">{v}</div></div>
                  ))}
                </div>
                <div className="font-mono text-xs text-muted-foreground">Chave: {nota.chave_acesso ?? "não encontrada no XML"}</div>
                {!nota.fornecedor_id ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-600" />Fornecedor com este CNPJ/CPF não está cadastrado.</div>
                    {!somenteLeitura && <Button size="sm" variant="outline" onClick={cadastrarFornecedor}><Truck className="mr-2 h-4 w-4" />Cadastrar com dados da nota</Button>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />Fornecedor vinculado ao cadastro.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Itens da Nota</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[1080px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto na Nota</TableHead><TableHead>EAN</TableHead><TableHead>Item Interno</TableHead>
                      <TableHead className="text-right">Qtd. Nota</TableHead><TableHead>Unid.</TableHead><TableHead>Fator</TableHead>
                      <TableHead className="text-right">Qtd. Estoque</TableHead><TableHead className="text-right">Custo recebido</TableHead><TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((l) => {
                      const final = l.quantidade * l.fator;
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="max-w-56 font-medium">{l.descricao}<div className="text-xs text-muted-foreground">{l.codigo_produto}</div></TableCell>
                          <TableCell className="font-mono text-xs">{l.ean ?? "Sem GTIN"}</TableCell>
                          <TableCell className="w-72">
                            {l.item ? (
                              <div className="space-y-1">
                                <div className="text-sm">#{l.item.codigo_interno} {l.item.descricao ?? l.item.referencia}</div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <SaldoInfo item={l.item} />
                                  {!l.item.saldo_conhecido && <button type="button" className="text-xs text-primary underline" onClick={() => setSaldoItem(l.item)}>Definir saldo inicial</button>}
                                </div>
                                {!somenteLeitura && <div className="flex gap-2"><BuscaItem onEscolher={(i) => atualizar(l.id, { item_id: i.id, item: i })} /><Button size="sm" variant="ghost" onClick={() => atualizar(l.id, { item_id: null, item: null })}>Desvincular</Button></div>}
                              </div>
                            ) : !somenteLeitura ? (
                              <div className="flex gap-2">
                                <BuscaItem onEscolher={(i) => atualizar(l.id, { item_id: i.id, item: i })} />
                                <Button size="sm" onClick={() => setCadastrando(l)}><PackagePlus className="mr-1 h-4 w-4" />Cadastrar</Button>
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right">{qtdFmt(l.quantidade)}</TableCell>
                          <TableCell>{l.unidade}</TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="any" value={l.fator} disabled={somenteLeitura} aria-label={`Fator de conversão de ${l.descricao}`}
                              onChange={(e) => atualizar(l.id, { fator: Number(e.target.value) })} className={`h-9 w-24 ${l.fator > 0 ? "" : "border-destructive"}`} />
                          </TableCell>
                          <TableCell className="text-right font-semibold">{qtdFmt(final)}</TableCell>
                          <TableCell className="text-right text-sm">{brl(l.valor_total)}<div className="text-xs text-muted-foreground">{l.valor_unitario !== null ? `${brl(l.valor_unitario)}/${l.unidade ?? "un"}` : ""}</div></TableCell>
                          <TableCell>
                            {l.item_id && l.fator > 0 && l.quantidade > 0
                              ? <Badge className="gap-1 border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" />Pronto</Badge>
                              : !l.item_id
                                ? <Badge className="gap-1 border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400"><Link2 className="h-3 w-3" />Vincular</Badge>
                                : <Badge variant="destructive">Qtd./fator inválido</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" />O custo recebido fica guardado na nota; o custo do cadastro do item não é alterado.</p>
              </CardContent>
            </Card>

            {!somenteLeitura && problemas.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <div className="mb-1 font-medium">Antes de confirmar:</div>
                <ul className="list-disc pl-5">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => { if (!alterado || confirm("Sair sem salvar as alterações?")) { setNota(null); setLinhas([]); setChave(""); } }}>Voltar</Button>
              {!somenteLeitura && (
                <>
                  <Button variant="ghost" className="text-destructive" onClick={descartar}><Trash2 className="mr-2 h-4 w-4" />Descartar</Button>
                  <Button variant="outline" onClick={() => salvar()} disabled={!alterado}>Salvar Rascunho</Button>
                  <Button size="lg" onClick={confirmarEntrada} disabled={confirmar.isPending || problemas.length > 0}>
                    {confirmar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Entrada no Estoque
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={sefazAberto} onOpenChange={setSefazAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consulta à SEFAZ indisponível</DialogTitle>
            <DialogDescription>
              O sistema ainda não tem integração nem certificado digital autorizado para baixar notas da SEFAZ. Nenhuma consulta foi feita.
              Para dar entrada, baixe o XML da nota (portal da SEFAZ, e-mail do fornecedor ou seu emissor) e use “Importar XML da NF-e”. Pela chave de acesso é possível abrir um rascunho já importado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setSefazAberto(false)}>Entendi</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {cadastrando && (
        <CadastroItemDialog linha={cadastrando} onFechar={() => setCadastrando(null)}
          onCriado={(i) => { atualizar(cadastrando.id, { item_id: i.id, item: i }); setCadastrando(null); invalidar(); }} />
      )}
      {saldoItem && (
        <SaldoInicialDialog item={saldoItem} onFechar={() => setSaldoItem(null)}
          onSalvo={(i) => { setLinhas((ls) => ls.map((l) => (l.item_id === i.id ? { ...l, item: i } : l))); setSaldoItem(null); invalidar(); }} />
      )}
    </AppShell>
  );
}

function CadastroItemDialog({ linha, onFechar, onCriado }: { linha: LinhaNota; onFechar: () => void; onCriado: (i: ItemVinculo) => void }) {
  const setores = useSetores();
  const [descricao, setDescricao] = useState(linha.descricao);
  const [ean, setEan] = useState(linha.ean ?? "");
  const [unidade, setUnidade] = useState(UNIDADES.includes((linha.unidade ?? "").toUpperCase()) ? (linha.unidade ?? "").toUpperCase() : "UN");
  const [setor, setSetor] = useState("");
  const [preco, setPreco] = useState("");
  const [salvando, setSalvando] = useState(false);
  const custoUn = linha.valor_total !== null && linha.quantidade > 0 && linha.fator > 0 ? linha.valor_total / (linha.quantidade * linha.fator) : null;

  const salvar = async () => {
    if (!descricao.trim()) return toast.error("Informe a descrição");
    setSalvando(true);
    try {
      const codigo = await proximoCodigoInterno();
      const { data, error } = await supabase.from("itens").insert({
        codigo_interno: codigo,
        descricao: descricao.trim(),
        referencia: linha.codigo_produto,
        codigo_barras: ean.replace(/\D/g, "") || null,
        unidade_medida: unidade,
        setor: setor || null,
        preco_venda: preco ? Number(preco) : null,
        custo_aquisicao: custoUn !== null ? Number(custoUn.toFixed(4)) : null,
        status: "ativo",
      }).select("id").single();
      if (error) throw error;
      onCriado(await itemPorId(data.id));
      toast.success(`Item #${codigo} cadastrado e vinculado`);
    } catch (e) { toast.error(msg(e)); } finally { setSalvando(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cadastrar item a partir da nota</DialogTitle><DialogDescription>O item é criado no cadastro real e vinculado a esta linha. O saldo começa como “não informado”.</DialogDescription></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2"><Label htmlFor="ci-desc">Descrição</Label><Input id="ci-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="ci-ean">Código de barras</Label><Input id="ci-ean" value={ean} onChange={(e) => setEan(e.target.value)} /></div>
            <div className="space-y-2"><Label>Unidade</Label>
              <Select value={unidade} onValueChange={setUnidade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Setor</Label>
              <Select value={setor || "__nenhum"} onValueChange={(v) => setSetor(v === "__nenhum" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__nenhum">Sem setor</SelectItem>{(setores.data ?? []).map((s) => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="ci-preco">Preço de venda (R$)</Label><Input id="ci-preco" type="number" step="0.01" min={0} value={preco} onChange={(e) => setPreco(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Custo inicial do cadastro: {custoUn !== null ? brl(custoUn) : "não informado"} por {unidade} (calculado desta nota; só vale para o item novo).</p>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onFechar}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar e vincular</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaldoInicialDialog({ item, onFechar, onSalvo }: { item: ItemVinculo; onFechar: () => void; onSalvo: (i: ItemVinculo) => void }) {
  const [saldo, setSaldo] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    const n = Number(saldo);
    if (saldo === "" || !Number.isFinite(n) || n < 0) return toast.error("Informe um saldo zero ou positivo");
    if (!obs.trim()) return toast.error("Informe a justificativa (ex.: contagem física de hoje)");
    setSalvando(true);
    try { await definirSaldoInicial(item.id, n, obs.trim()); onSalvo(await itemPorId(item.id)); toast.success("Saldo inicial registrado no histórico de movimentações"); }
    catch (e) { toast.error(msg(e)); } finally { setSalvando(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir saldo inicial</DialogTitle>
          <DialogDescription>#{item.codigo_interno} {item.descricao}. Informe a quantidade contada fisicamente. Isso pode ser feito uma vez por item e fica registrado com seu nome.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2"><Label htmlFor="si-qtd">Saldo contado ({item.unidade_medida ?? "un"})</Label><Input id="si-qtd" type="number" min={0} step="any" value={saldo} onChange={(e) => setSaldo(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="si-obs">Justificativa</Label><Input id="si-obs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Contagem física em 03/11" /></div>
          {Number(item.saldo_atual) > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">Já existem {qtdFmt(item.saldo_atual)} registrados por entradas. O saldo passará a ser exatamente o valor contado.</p>}
        </div>
        <DialogFooter><Button variant="ghost" onClick={onFechar}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>Registrar saldo</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
