import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Trash2, UploadCloud } from "lucide-react";
import {
  buscarCnpjsExistentes,
  buscarNomesExistentes,
  CAMPOS_FIXOS_FORNECEDOR,
  somenteDigitos,
  upsertLoteFornecedores,
  useCriarCamposFornecedor,
  type FornecedorCampo,
} from "@/lib/fornecedores";

type Etapa = "upload" | "mapear" | "previa" | "processando" | "resultado";
type Destino = { tipo: "fixo" | "extra" | "ignorar"; chave: string };
type ErroLinha = { linha: number; identificacao: string; campo: string; motivo: string };

const IGNORAR = "__ignorar__";
const NOVO = "__novo__";

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sugerir(coluna: string, campos: FornecedorCampo[]): Destino {
  const n = normalizar(coluna);
  const exato = campos.find((c) => c.chave === n || normalizar(c.rotulo) === n);
  if (exato) return { tipo: exato.fixo ? "fixo" : "extra", chave: exato.chave };
  const aliases: Record<string, string> = {
    codigo: "codigo",
    cod: "codigo",
    razao: "razao_social",
    razao_social: "razao_social",
    fornecedor: "razao_social",
    nome: "razao_social",
    fantasia: "nome_fantasia",
    nome_fantasia: "nome_fantasia",
    cnpj_cpf: "cnpj",
    documento: "cnpj",
    ie: "inscricao_estadual",
    inscricao: "inscricao_estadual",
    inscricao_estadual: "inscricao_estadual",
    fone: "telefone",
    celular: "telefone",
    contato: "telefone",
    e_mail: "email",
    municipio: "cidade",
    estado: "uf",
    obs: "observacoes",
    observacao: "observacoes",
  };
  if (aliases[n]) return { tipo: "fixo", chave: aliases[n] };
  return { tipo: "extra", chave: n };
}

export function ImportarFornecedores({
  open,
  onOpenChange,
  campos,
  onConcluir,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campos: FornecedorCampo[];
  onConcluir: () => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [colunas, setColunas] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<Record<string, unknown>[]>([]);
  const [mapa, setMapa] = useState<Record<string, Destino>>({});
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<{ novos: number; atualizados: number; erros: ErroLinha[] } | null>(null);
  const [cnpjsExistentes, setCnpjsExistentes] = useState<Set<string>>(new Set());
  const [nomesExistentes, setNomesExistentes] = useState<Map<string, string>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const criarCampos = useCriarCamposFornecedor();

  const reset = () => {
    setEtapa("upload");
    setArquivo(null);
    setColunas([]);
    setLinhas([]);
    setMapa({});
    setProgresso(0);
    setResultado(null);
    setCnpjsExistentes(new Set());
    setNomesExistentes(new Map());
  };

  const fechar = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const lerArquivo = async (file: File) => {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error("Selecione um arquivo .xlsx ou .xls");
      return;
    }
    setArquivo(file);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]!]!;
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
      if (json.length === 0) {
        toast.error("A planilha está vazia.");
        return;
      }
      const cols = Array.from(new Set(json.flatMap((r) => Object.keys(r))));
      setColunas(cols);
      setLinhas(json);
      const m: Record<string, Destino> = {};
      for (const c of cols) m[c] = sugerir(c, campos);
      setMapa(m);
      setEtapa("mapear");
    } catch (e) {
      toast.error("Não foi possível ler a planilha: " + (e as Error).message);
    }
  };

  const temNome = Object.values(mapa).some((d) => d.tipo === "fixo" && d.chave === "razao_social");

  const validacao = useMemo(() => {
    if (etapa !== "previa" && etapa !== "processando" && etapa !== "resultado") return null;
    const erros: ErroLinha[] = [];
    const vistos = new Set<string>();
    const validos: { identificacao: string; existente: boolean; row: Record<string, unknown> }[] = [];

    linhas.forEach((raw, i) => {
      const linhaExcel = i + 2;
      const fixos: Record<string, unknown> = {};
      const extras: Record<string, unknown> = {};

      for (const col of colunas) {
        const dest = mapa[col];
        if (!dest || dest.tipo === "ignorar") continue;
        const v = raw[col];
        if (dest.tipo === "fixo") {
          fixos[dest.chave] = v === null || v === undefined || v === "" ? null : String(v).trim();
        } else if (v !== null && v !== undefined && v !== "") {
          extras[dest.chave] = v;
        }
      }

      const nome = String(fixos.razao_social ?? fixos.nome ?? "").trim();
      const cnpj = somenteDigitos(String(fixos.cnpj ?? ""));
      const codigoBruto = somenteDigitos(String(fixos.codigo ?? ""));

      if (!nome) {
        erros.push({ linha: linhaExcel, identificacao: "—", campo: "Razão Social", motivo: "Ausente" });
        return;
      }
      if (cnpj && cnpj.length !== 14) {
        erros.push({ linha: linhaExcel, identificacao: nome, campo: "CNPJ", motivo: "Deve ter 14 dígitos" });
        return;
      }
      const chave = cnpj || `nome:${nome.toLowerCase()}`;
      if (vistos.has(chave)) {
        erros.push({
          linha: linhaExcel,
          identificacao: cnpj || nome,
          campo: cnpj ? "CNPJ" : "Nome",
          motivo: "Duplicado no arquivo",
        });
        return;
      }
      vistos.add(chave);

      const existente = cnpj ? cnpjsExistentes.has(cnpj) : nomesExistentes.has(nome);
      const row: Record<string, unknown> = {
        nome,
        razao_social: nome,
        nome_fantasia: fixos.nome_fantasia ?? null,
        inscricao_estadual: fixos.inscricao_estadual ?? null,
        cnpj: cnpj || null,
        telefone: fixos.telefone ?? null,
        email: fixos.email ?? null,
        cidade: fixos.cidade ?? null,
        uf: fixos.uf ? String(fixos.uf).toUpperCase() : null,
        observacoes: fixos.observacoes ?? null,
        extras,
      };
      if (codigoBruto) row.codigo = Number(codigoBruto);
      if (!cnpj && existente) row.id = nomesExistentes.get(nome);
      validos.push({ identificacao: cnpj ? cnpj : nome, existente, row });
    });

    const atualizados = validos.filter((v) => v.existente).length;
    return { erros, validos, novos: validos.length - atualizados, atualizados };
  }, [etapa, linhas, colunas, mapa, cnpjsExistentes, nomesExistentes]);

  const irParaPrevia = async () => {
    const colNome = Object.entries(mapa).find(([, d]) => d.tipo === "fixo" && d.chave === "nome")?.[0];
    const colCnpj = Object.entries(mapa).find(([, d]) => d.tipo === "fixo" && d.chave === "cnpj")?.[0];
    const cnpjs = colCnpj
      ? Array.from(
          new Set(
            linhas
              .map((r) => somenteDigitos(String(r[colCnpj] ?? "")))
              .filter((c) => c.length === 14),
          ),
        )
      : [];
    const nomes = colNome
      ? Array.from(new Set(linhas.map((r) => String(r[colNome] ?? "").trim()).filter(Boolean)))
      : [];
    try {
      setCnpjsExistentes(await buscarCnpjsExistentes(cnpjs));
      setNomesExistentes(await buscarNomesExistentes(nomes));
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    setEtapa("previa");
  };

  const importar = async () => {
    if (!validacao) return;
    setEtapa("processando");
    setProgresso(0);
    try {
      const novosCampos = Object.entries(mapa)
        .filter(([, d]) => d.tipo === "extra")
        .filter(([, d]) => !campos.some((c) => c.chave === d.chave))
        .map(([col, d]) => ({ chave: d.chave, rotulo: col }));
      if (novosCampos.length) await criarCampos.mutateAsync(novosCampos);

      const lote = 300;
      const rows = validacao.validos.map((v) => v.row);
      for (let i = 0; i < rows.length; i += lote) {
        await upsertLoteFornecedores(rows.slice(i, i + lote));
        setProgresso(Math.round((Math.min(i + lote, rows.length) / Math.max(rows.length, 1)) * 100));
      }
      setResultado({ novos: validacao.novos, atualizados: validacao.atualizados, erros: validacao.erros });
      setEtapa("resultado");
      onConcluir();
    } catch (e) {
      toast.error("Falha na importação: " + (e as Error).message);
      setEtapa("previa");
    }
  };

  const baixarErros = () => {
    const erros = resultado?.erros ?? [];
    const csv = [
      "Linha;Identificacao;Campo;Motivo",
      ...erros.map((e) => `${e.linha};${e.identificacao};${e.campo};${e.motivo}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "erros-importacao-fornecedores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar Fornecedores via Excel</DialogTitle>
          <DialogDescription>
            {etapa === "upload" && "Selecione a planilha com a base de fornecedores."}
            {etapa === "mapear" && "Relacione as colunas da planilha aos campos do sistema."}
            {etapa === "previa" && "Revise a validação antes de confirmar."}
            {etapa === "processando" && "Importando os registros…"}
            {etapa === "resultado" && "Importação concluída."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          {etapa === "upload" && (
            <div className="py-2">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void lerArquivo(f);
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void lerArquivo(f);
                }}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors hover:border-primary hover:bg-primary/5"
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Arraste a planilha aqui ou clique para selecionar</span>
                <span className="text-xs text-muted-foreground">Formatos aceitos: .xlsx e .xls</span>
              </button>
              {arquivo && (
                <div className="mt-4 flex items-center gap-3 rounded-lg border p-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div className="flex-1 truncate text-sm">
                    <div className="truncate font-medium">{arquivo.name}</div>
                    <div className="text-xs text-muted-foreground">{(arquivo.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={reset}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {etapa === "mapear" && (
            <div className="space-y-2 py-2">
              <p className="text-sm text-muted-foreground">
                {colunas.length} colunas e {linhas.length} linhas encontradas.
              </p>
              {!temNome && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Selecione qual coluna corresponde ao Nome.
                </div>
              )}
              <div className="divide-y rounded-lg border">
                {colunas.map((col) => {
                  const d = mapa[col]!;
                  const valor = d.tipo === "ignorar" ? IGNORAR : d.tipo === "fixo" ? d.chave : NOVO;
                  return (
                    <div key={col} className="grid grid-cols-2 items-center gap-3 p-2">
                      <div className="truncate text-sm font-medium">{col}</div>
                      <Select
                        value={valor}
                        onValueChange={(v) => {
                          setMapa((m) => ({
                            ...m,
                            [col]:
                              v === IGNORAR
                                ? { tipo: "ignorar", chave: "" }
                                : v === NOVO
                                  ? { tipo: "extra", chave: normalizar(col) }
                                  : { tipo: "fixo", chave: v },
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAMPOS_FIXOS_FORNECEDOR.map((f) => (
                            <SelectItem key={f} value={f}>
                              {campos.find((c) => c.chave === f)?.rotulo ?? f}
                            </SelectItem>
                          ))}
                          <SelectItem value={NOVO}>Campo adicional</SelectItem>
                          <SelectItem value={IGNORAR}>Ignorar coluna</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {etapa === "previa" && validacao && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Novos: {validacao.novos}</Badge>
                <Badge variant="secondary">Atualizações: {validacao.atualizados}</Badge>
                <Badge variant={validacao.erros.length ? "destructive" : "secondary"}>
                  Com erro: {validacao.erros.length}
                </Badge>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left font-medium">Nome</th>
                      <th className="p-2 text-left font-medium">CNPJ</th>
                      <th className="p-2 text-left font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {validacao.validos.slice(0, 50).map((v, i) => (
                      <tr key={i}>
                        <td className="truncate p-2">{String(v.row.nome ?? "—")}</td>
                        <td className="p-2">{String(v.row.cnpj ?? "—")}</td>
                        <td className="p-2">
                          {v.existente ? (
                            <span className="text-amber-600">Atualizar</span>
                          ) : (
                            <span className="text-emerald-600">Novo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validacao.erros.length > 0 && (
                <div className="rounded-lg border border-destructive/40 p-3">
                  <div className="mb-2 text-sm font-medium text-destructive">Linhas com erro</div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {validacao.erros.slice(0, 20).map((e, i) => (
                      <li key={i}>
                        Linha {e.linha} · {e.campo}: {e.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {etapa === "processando" && (
            <div className="space-y-3 py-8">
              <Progress value={progresso} />
              <p className="text-center text-sm text-muted-foreground">{progresso}% concluído</p>
            </div>
          )}

          {etapa === "resultado" && resultado && (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <div className="flex justify-center gap-2">
                <Badge variant="secondary">Novos: {resultado.novos}</Badge>
                <Badge variant="secondary">Atualizados: {resultado.atualizados}</Badge>
                <Badge variant={resultado.erros.length ? "destructive" : "secondary"}>
                  Erros: {resultado.erros.length}
                </Badge>
              </div>
              {resultado.erros.length > 0 && (
                <Button variant="outline" className="gap-2" onClick={baixarErros}>
                  <Download className="h-4 w-4" /> Baixar relatório de erros
                </Button>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          {etapa === "mapear" && (
            <>
              <Button variant="ghost" onClick={reset}>
                Voltar
              </Button>
              <Button onClick={irParaPrevia} disabled={!temNome}>
                Validar
              </Button>
            </>
          )}
          {etapa === "previa" && (
            <>
              <Button variant="ghost" onClick={() => setEtapa("mapear")}>
                Voltar
              </Button>
              <Button onClick={importar} disabled={!validacao || validacao.validos.length === 0}>
                Confirmar importação
              </Button>
            </>
          )}
          {etapa === "resultado" && <Button onClick={() => fechar(false)}>Concluir</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
