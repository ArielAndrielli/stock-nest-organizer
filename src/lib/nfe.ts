// Leitura de XML de NF-e (modelo 55) e regras de validação da pré-entrada.

export type NfeLinha = {
  ordem: number;
  codigo_produto: string | null;
  descricao: string;
  ean: string | null;
  ncm: string | null;
  unidade: string | null;
  quantidade: number;
  valor_unitario: number | null;
  valor_total: number | null;
};

export type NfeCabecalho = {
  chave_acesso: string | null;
  numero: string | null;
  serie: string | null;
  data_emissao: string | null; // YYYY-MM-DD
  emit_documento: string | null;
  emit_razao_social: string | null;
  emit_nome_fantasia: string | null;
  emit_ie: string | null;
  emit_uf: string | null;
  emit_telefone: string | null;
  valor_total: number | null;
};

export type NfeLida = { cabecalho: NfeCabecalho; linhas: NfeLinha[] };

const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Dígito verificador da chave (módulo 11, pesos 2..9). */
export function chaveAcessoValida(chave: string): boolean {
  if (!/^\d{44}$/.test(chave)) return false;
  const base = chave.slice(0, 43);
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === Number(chave[43]);
}

/** EAN válido de nota ("SEM GTIN" e vazios viram null). */
export function normalizarEan(v: string | null | undefined): string | null {
  const d = digitos(v);
  return d.length >= 8 ? d : null;
}

function num(v: string | null): number | null {
  if (v === null || v.trim() === "") return null;
  const n = Number(v.trim());
  return Number.isFinite(n) ? n : null;
}

/** Interpreta o XML (nfeProc ou NFe). Lança erro com mensagem clara se não for NF-e. */
export function lerXmlNfe(xml: string, parser?: DOMParser): NfeLida {
  const p = parser ?? new DOMParser();
  const doc = p.parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Arquivo XML inválido ou corrompido");
  const inf = doc.getElementsByTagName("infNFe")[0];
  if (!inf) throw new Error("O arquivo não é uma NF-e (tag infNFe não encontrada)");

  const primeiro = (raiz: Element | undefined, tag: string): Element | undefined =>
    raiz ? (raiz.getElementsByTagName(tag)[0] as Element | undefined) : undefined;
  const txt = (raiz: Element | undefined, tag: string): string | null => {
    const t = primeiro(raiz, tag)?.textContent?.trim();
    return t ? t : null;
  };

  const ide = primeiro(inf, "ide");
  const emit = primeiro(inf, "emit");
  const ender = primeiro(emit, "enderEmit");
  const tot = primeiro(inf, "ICMSTot");

  let chave = digitos(inf.getAttribute("Id"));
  if (chave.length !== 44) chave = digitos(txt(doc.documentElement, "chNFe"));
  const dh = txt(ide, "dhEmi") ?? txt(ide, "dEmi");

  const cabecalho: NfeCabecalho = {
    chave_acesso: chave.length === 44 ? chave : null,
    numero: txt(ide, "nNF"),
    serie: txt(ide, "serie"),
    data_emissao: dh && /^\d{4}-\d{2}-\d{2}/.test(dh) ? dh.slice(0, 10) : null,
    emit_documento: digitos(txt(emit, "CNPJ") ?? txt(emit, "CPF")) || null,
    emit_razao_social: txt(emit, "xNome"),
    emit_nome_fantasia: txt(emit, "xFant"),
    emit_ie: txt(emit, "IE"),
    emit_uf: txt(ender, "UF"),
    emit_telefone: txt(ender, "fone"),
    valor_total: num(txt(tot, "vNF")),
  };

  const dets = Array.from(inf.getElementsByTagName("det"));
  const linhas: NfeLinha[] = dets.map((det, i) => {
    const prod = primeiro(det, "prod");
    return {
      ordem: Number(det.getAttribute("nItem")) || i + 1,
      codigo_produto: txt(prod, "cProd"),
      descricao: txt(prod, "xProd") ?? "",
      ean: normalizarEan(txt(prod, "cEAN")) ?? normalizarEan(txt(prod, "cEANTrib")),
      ncm: txt(prod, "NCM"),
      unidade: txt(prod, "uCom"),
      quantidade: num(txt(prod, "qCom")) ?? 0,
      valor_unitario: num(txt(prod, "vUnCom")),
      valor_total: num(txt(prod, "vProd")),
    };
  });
  if (!linhas.length) throw new Error("A NF-e não possui itens (det)");
  return { cabecalho, linhas };
}

export type LinhaValidar = { quantidade: number; fator: number; item_id: string | null };

/** Mesmas regras que o banco aplica na confirmação. Retorna lista de problemas. */
export function problemasConfirmacao(c: NfeCabecalho, linhas: LinhaValidar[]): string[] {
  const p: string[] = [];
  if (!c.chave_acesso || !/^\d{44}$/.test(c.chave_acesso)) p.push("Chave de acesso deve ter 44 dígitos");
  else if (!chaveAcessoValida(c.chave_acesso)) p.push("Dígito verificador da chave de acesso inválido");
  if (!c.numero?.trim()) p.push("Número da nota não informado");
  if (!c.data_emissao) p.push("Data de emissão não informada");
  if (!c.emit_documento?.trim()) p.push("CNPJ/CPF do fornecedor não informado");
  if (!c.emit_razao_social?.trim()) p.push("Razão social do fornecedor não informada");
  if (c.valor_total === null || !Number.isFinite(c.valor_total)) p.push("Valor total não informado");
  if (!linhas.length) p.push("A nota não possui linhas");
  const qtdRuim = linhas.filter((l) => !(l.quantidade > 0) || !(l.fator > 0)).length;
  if (qtdRuim) p.push(`${qtdRuim} linha(s) com quantidade ou fator não positivo`);
  const semVinculo = linhas.filter((l) => !l.item_id).length;
  if (semVinculo) p.push(`${semVinculo} linha(s) sem item vinculado`);
  return p;
}
