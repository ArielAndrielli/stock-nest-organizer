import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudDownload, FileUp, Link2, PackagePlus, ScanLine, Sparkles, Truck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/pre-entrada")({
  head: () => ({
    meta: [
      { title: "Pré-Entrada de Mercadorias — Estoque" },
      { name: "description", content: "Transforme notas fiscais em rascunhos de entrada de estoque." },
      { property: "og:title", content: "Pré-Entrada de Mercadorias — Estoque" },
      { property: "og:description", content: "Leitura de NF, vínculo de produtos e entrada no estoque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PreEntradaPage,
});

type Status = "pronto" | "vincular" | "novo";
type Linha = { id: number; nome: string; ean: string; interno: string | null; qtd: number; unidade: string; fator: number; status: Status };

const PRODUTOS_INTERNOS = ["Caixa Papelão 30x20", "Etiqueta Adesiva 50mm", "Fita Adesiva Transparente", "Embalagem Plástica 1kg", "Cartão Kraft A4"];

const ITENS_EXEMPLO: Linha[] = [
  { id: 1, nome: "CX PAPELAO ONDULADO 30X20X15", ean: "7891234560012", interno: "Caixa Papelão 30x20", qtd: 10, unidade: "CX", fator: 25, status: "pronto" },
  { id: 2, nome: "FITA ADES TRANSP 45MMX100M", ean: "7899876543210", interno: null, qtd: 5, unidade: "PCT", fator: 12, status: "vincular" },
  { id: 3, nome: "ROTULO TERMICO 100X150 C/500", ean: "7895551112223", interno: null, qtd: 8, unidade: "RL", fator: 1, status: "novo" },
  { id: 4, nome: "ETIQ ADESIVA 50MM BRANCA", ean: "7891112223334", interno: "Etiqueta Adesiva 50mm", qtd: 20, unidade: "UN", fator: 1, status: "pronto" },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StatusBadge({ s }: { s: Status }) {
  if (s === "pronto") return <Badge className="gap-1 border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" />Pronto</Badge>;
  if (s === "vincular") return <Badge className="gap-1 border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400"><Link2 className="h-3 w-3" />Vincular</Badge>;
  return <Badge className="gap-1 border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-400"><PackagePlus className="h-3 w-3" />Novo Produto</Badge>;
}

function PreEntradaPage() {
  const [chave, setChave] = useState("");
  const [nota, setNota] = useState<null | { numero: string; emissao: string; fornecedor: string; doc: string; total: number }>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [fornecedorNovo, setFornecedorNovo] = useState(true);
  const [cadastrando, setCadastrando] = useState<Linha | null>(null);
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const simular = (origem = "leitura") => {
    setChave((c) => c || "35260912345678000190550010000123451000123456");
    setNota({ numero: "000.012.345", emissao: new Date().toLocaleDateString("pt-BR"), fornecedor: "Embalagens Paulista Ltda", doc: "12.345.678/0001-90", total: 4872.5 });
    setLinhas(ITENS_EXEMPLO.map((l) => ({ ...l })));
    setFornecedorNovo(true);
    toast.success(origem === "xml" ? "XML carregado com sucesso" : "Nota fiscal lida com sucesso");
  };

  const atualizar = (id: number, patch: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const salvarCadastro = () => {
    if (!cadastrando) return;
    if (!categoria || !preco) return toast.error("Informe categoria e preço de venda");
    atualizar(cadastrando.id, { interno: cadastrando.nome, status: "pronto" });
    toast.success("Produto cadastrado e vinculado");
    setCadastrando(null); setCategoria(""); setPreco("");
  };

  const cancelar = () => { setNota(null); setLinhas([]); setChave(""); toast("Rascunho descartado"); };

  const confirmar = () => {
    const pendentes = linhas.filter((l) => l.status !== "pronto").length;
    if (pendentes) return toast.error(`Existem ${pendentes} item(ns) sem vínculo`);
    toast.success(`Sucesso! ${linhas.length} itens adicionados ao estoque e contas a pagar gerado`);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pré-Entrada de Mercadorias</h1>
          <p className="text-sm text-muted-foreground">Transforme uma Nota Fiscal em rascunho de entrada de estoque.</p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input value={chave} onChange={(e) => setChave(e.target.value.replace(/\D/g, "").slice(0, 44))} placeholder="Bipar Chave de Acesso da NF (44 dígitos) ou ler QR Code" className="h-12 pl-11 font-mono text-base" />
              </div>
              <Button size="lg" className="h-12" onClick={() => simular()}><Sparkles className="mr-2 h-4 w-4" />Simular Leitura</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={(e) => { if (e.target.files?.length) simular("xml"); e.target.value = ""; }} />
              <Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp className="mr-2 h-4 w-4" />Upload de Arquivo XML</Button>
              <Button variant="ghost" onClick={() => toast.info("Nenhuma nota nova encontrada na SEFAZ (simulação)")}><CloudDownload className="mr-2 h-4 w-4" />Importar Notas da SEFAZ</Button>
            </div>
          </CardContent>
        </Card>

        {!nota ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <ScanLine className="mx-auto mb-3 h-10 w-10 opacity-50" />
            Bipe uma chave de acesso, envie um XML ou clique em “Simular Leitura” para começar.
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Rascunho da Nota Fiscal</CardTitle>
                <Badge variant="secondary">Em Análise</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[["Número da NF", nota.numero], ["Data de Emissão", nota.emissao], ["Fornecedor", nota.fornecedor], ["CNPJ", nota.doc], ["Valor Total", brl(nota.total)]].map(([k, v]) => (
                    <div key={k}><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium">{v}</div></div>
                  ))}
                </div>
                {fornecedorNovo ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-600" />Fornecedor não cadastrado no sistema.</div>
                    <Button size="sm" variant="outline" onClick={() => { setFornecedorNovo(false); toast.success("Fornecedor cadastrado automaticamente"); }}><Truck className="mr-2 h-4 w-4" />Cadastrar Automaticamente</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />Fornecedor vinculado ao cadastro.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Itens da Nota</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto na Nota</TableHead><TableHead>EAN</TableHead><TableHead>Produto Interno</TableHead>
                      <TableHead className="text-right">Qtd. Nota</TableHead><TableHead>Unid.</TableHead><TableHead>Fator</TableHead>
                      <TableHead className="text-right">Qtd. Final</TableHead><TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.nome}</TableCell>
                        <TableCell className="font-mono text-xs">{l.ean}</TableCell>
                        <TableCell className="w-56">
                          {l.status === "novo" ? (
                            <Button size="sm" onClick={() => setCadastrando(l)}><PackagePlus className="mr-1 h-4 w-4" />Cadastrar</Button>
                          ) : l.status === "vincular" ? (
                            <Select onValueChange={(v) => atualizar(l.id, { interno: v, status: "pronto" })}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar produto" /></SelectTrigger>
                              <SelectContent>{PRODUTOS_INTERNOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : <span>{l.interno}</span>}
                        </TableCell>
                        <TableCell className="text-right">{l.qtd}</TableCell>
                        <TableCell>{l.unidade}</TableCell>
                        <TableCell><Input type="number" min={1} value={l.fator} onChange={(e) => atualizar(l.id, { fator: Math.max(0, Number(e.target.value)) })} className="h-9 w-20" /></TableCell>
                        <TableCell className="text-right font-semibold">{(l.qtd * l.fator).toLocaleString("pt-BR")}</TableCell>
                        <TableCell><StatusBadge s={l.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={cancelar}>Cancelar</Button>
              <Button variant="outline" onClick={() => toast.success("Rascunho salvo")}>Salvar Rascunho</Button>
              <Button size="lg" onClick={confirmar}>Confirmar Entrada no Estoque</Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!cadastrando} onOpenChange={(o) => !o && setCadastrando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastro rápido de produto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{cadastrando?.nome}</div>
            <div className="space-y-2"><Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{["Embalagem", "Etiqueta", "Matéria-prima", "Cartão", "Outros"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Preço de Venda (R$)</Label><Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCadastrando(null)}>Cancelar</Button>
            <Button onClick={salvarCadastro}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
